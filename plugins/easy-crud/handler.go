package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	pb "github.com/crom/crom-cloud/core/proto"
)

// ========================================================================
// Tipos internos
// ========================================================================

// Column define uma coluna de tabela.
type Column struct {
	Name string `json:"name"`
	Type string `json:"type"` // string, number, boolean
}

// Row é um registro genérico.
type Row map[string]interface{}

// Table armazena dados in-memory para um developer.
type Table struct {
	Name      string   `json:"name"`
	Columns   []Column `json:"columns"`
	Rows      []Row    `json:"rows"`
	CreatedAt string   `json:"created_at"`
	NextID    int      `json:"next_id"`
}

// DeveloperData são as tabelas de um developer.
type DeveloperData struct {
	Tables map[string]*Table
}

// Handler implementa o serviço CromPlugin.
type Handler struct {
	pb.UnimplementedCromPluginServer
	mu   sync.RWMutex
	data map[string]*DeveloperData // developer_id -> data
}

// NewHandler cria um novo handler do plugin.
func NewHandler() *Handler {
	return &Handler{
		data: make(map[string]*DeveloperData),
	}
}

func (h *Handler) getDevData(devID string) *DeveloperData {
	if d, ok := h.data[devID]; ok {
		return d
	}

	// Lazy load: tentar carregar do disco
	loaded, err := LoadDevData(devID)
	if err != nil {
		log.Printf("[easy-crud] Erro ao carregar dados do disco para %s: %v", devID, err)
	}
	if loaded != nil {
		h.data[devID] = loaded
		log.Printf("[easy-crud] Dados restaurados do disco para developer %s (%d tabelas)", devID, len(loaded.Tables))
		return loaded
	}

	d := &DeveloperData{Tables: make(map[string]*Table)}
	h.data[devID] = d
	return d
}

// persist salva os dados do developer no disco após mutação.
func (h *Handler) persist(devID string) {
	devData := h.data[devID]
	if devData == nil {
		return
	}
	if err := SaveDevData(devID, devData); err != nil {
		log.Printf("[easy-crud] ERRO ao persistir dados de %s: %v", devID, err)
	}
}

// ========================================================================
// gRPC — Contrato obrigatório
// ========================================================================

func (h *Handler) GetManifest(ctx context.Context, _ *pb.Empty) (*pb.Manifest, error) {
	return &pb.Manifest{
		Slug:        "easy-crud",
		Name:        "Easy CRUD",
		Version:     "1.0.0",
		Description: "Backend-as-a-Service: crie tabelas e APIs REST dinâmicas via interface. Controle granular por API Key.",
		Icon:        "database",
		UiType:      "schema",
		Routes: []*pb.RouteInfo{
			{Method: "GET", Path: "/tables", Scope: "read"},
			{Method: "POST", Path: "/tables/create", Scope: "admin"},
			{Method: "POST", Path: "/tables/drop", Scope: "admin"},
			{Method: "GET", Path: "/data/*", Scope: "read"},
			{Method: "POST", Path: "/data/*", Scope: "write"},
		},
	}, nil
}

func (h *Handler) HealthCheck(ctx context.Context, _ *pb.Empty) (*pb.HealthResponse, error) {
	return &pb.HealthResponse{
		Healthy: true,
		Message: "easy-crud is running",
	}, nil
}

// ========================================================================
// GetUI — Retorna a interface Schema JSON para o Dashboard
// ========================================================================

func (h *Handler) GetUI(ctx context.Context, req *pb.UIRequest) (*pb.UIResponse, error) {
	// O schema descreve a interface que o frontend Core vai renderizar
	schema := map[string]interface{}{
		"plugin":  "easy-crud",
		"version": "1.0.0",
		"ui_type": "schema",
		"pages": []map[string]interface{}{
			{
				"id":    "tables",
				"title": "Gerenciar Tabelas",
				"icon":  "database",
				"sections": []map[string]interface{}{
					{
						"type":  "table_list",
						"title": "Suas Tabelas",
						"api": map[string]string{
							"list":   "GET /tables",
							"create": "POST /tables/create",
							"delete": "POST /tables/drop",
						},
					},
					{
						"type":  "form",
						"title": "Criar Nova Tabela",
						"fields": []map[string]interface{}{
							{"name": "name", "label": "Nome da Tabela", "type": "text", "required": true, "placeholder": "ex: users"},
							{
								"name":  "columns",
								"label": "Colunas",
								"type":  "dynamic_list",
								"item_fields": []map[string]interface{}{
									{"name": "name", "label": "Nome", "type": "text", "required": true},
									{"name": "type", "label": "Tipo", "type": "select", "options": []string{"string", "number", "boolean"}},
								},
							},
						},
						"submit_action": "POST /tables/create",
						"submit_label":  "Criar Tabela",
					},
				},
			},
			{
				"id":    "data",
				"title": "Explorar Dados",
				"icon":  "table",
				"sections": []map[string]interface{}{
					{
						"type":        "data_browser",
						"title":       "Navegador de Registros",
						"table_list":  "GET /tables",
						"data_read":   "GET /data/{table}",
						"data_insert": "POST /data/{table}",
						"data_update": "PUT /data/{table}/{id}",
						"data_delete": "DELETE /data/{table}/{id}",
					},
				},
			},
			{
				"id":    "permissions",
				"title": "Controle de Acesso",
				"icon":  "shield",
				"sections": []map[string]interface{}{
					{
						"type":  "info",
						"title": "Permissões Granulares",
						"content": "Ao criar uma API Key, adicione o campo 'resource_id' com o nome da tabela " +
							"para restringir o acesso. Ex: resource_id='users' permite apenas leitura/escrita na tabela 'users'.",
					},
					{
						"type":   "resource_list",
						"title":  "Recursos Disponíveis",
						"source": "GET /tables",
						"field":  "name",
					},
				},
			},
		},
	}

	data, _ := json.Marshal(schema)
	return &pb.UIResponse{
		ContentType: "application/json",
		Content:     data,
		StatusCode:  200,
	}, nil
}

// ========================================================================
// ExecuteAction — Roteamento principal
// ========================================================================

func (h *Handler) ExecuteAction(ctx context.Context, req *pb.ActionRequest) (*pb.ActionResponse, error) {
	switch {
	case req.Action == "tables" && req.Method == "GET":
		return h.handleListTables(req)
	case req.Action == "tables/create" && req.Method == "POST":
		return h.handleCreateTable(req)
	case req.Action == "tables/drop" && req.Method == "POST":
		return h.handleDropTable(req)
	case strings.HasPrefix(req.Action, "data/"):
		parts := strings.Split(strings.TrimPrefix(req.Action, "data/"), "/")
		tableName := parts[0]

		if len(parts) == 1 {
			if req.Method == "GET" {
				return h.handleListData(req, tableName)
			}
			if req.Method == "POST" {
				return h.handleInsertData(req, tableName)
			}
		} else if len(parts) == 2 {
			idStr := parts[1]
			if req.Method == "PUT" {
				return h.handleUpdateData(req, tableName, idStr)
			}
			if req.Method == "DELETE" {
				return h.handleDeleteData(req, tableName, idStr)
			}
		}
		return respondErr(405, "Método não permitido ou rota inválida para /data/")
	case req.Action == "ping" || req.Action == "index":
		return respondJSON(200, map[string]string{"message": "pong from easy-crud"})
	// Meta endpoint para listar recursos disponíveis (usado pelo frontend na criação de API Keys)
	case req.Action == "_meta/resources":
		return h.handleListResources(req)
	default:
		return respondErr(404, fmt.Sprintf("Ação '%s' não encontrada", req.Action))
	}
}

// ========================================================================
// Handlers
// ========================================================================

func (h *Handler) handleListTables(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	devData := h.getDevData(req.DeveloperId)
	tables := make([]map[string]interface{}, 0)
	for _, t := range devData.Tables {
		tables = append(tables, map[string]interface{}{
			"name":       t.Name,
			"columns":    t.Columns,
			"row_count":  len(t.Rows),
			"created_at": t.CreatedAt,
		})
	}

	return respondJSON(200, map[string]interface{}{"tables": tables})
}

func (h *Handler) handleCreateTable(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	var input struct {
		Name    string   `json:"name"`
		Columns []Column `json:"columns"`
	}
	if err := json.Unmarshal(req.Payload, &input); err != nil {
		return respondErr(400, "Payload inválido: "+err.Error())
	}
	if input.Name == "" {
		return respondErr(400, "Nome da tabela é obrigatório")
	}

	devData := h.getDevData(req.DeveloperId)
	if _, exists := devData.Tables[input.Name]; exists {
		return respondErr(409, fmt.Sprintf("Tabela '%s' já existe", input.Name))
	}

	colNames := []string{"id"}
	for _, c := range input.Columns {
		colNames = append(colNames, c.Name)
	}
	colNames = append(colNames, "created_at")

	devData.Tables[input.Name] = &Table{
		Name:      input.Name,
		Columns:   input.Columns,
		Rows:      make([]Row, 0),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		NextID:    1,
	}

	h.persist(req.DeveloperId)

	return respondJSON(201, map[string]interface{}{
		"message": fmt.Sprintf("Tabela '%s' criada com sucesso", input.Name),
		"table":   input.Name,
		"columns": colNames,
	})
}

func (h *Handler) handleDropTable(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	var input struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(req.Payload, &input); err != nil {
		return respondErr(400, "Payload inválido")
	}

	devData := h.getDevData(req.DeveloperId)
	if _, exists := devData.Tables[input.Name]; !exists {
		return respondErr(404, fmt.Sprintf("Tabela '%s' não encontrada", input.Name))
	}

	delete(devData.Tables, input.Name)

	h.persist(req.DeveloperId)

	return respondJSON(200, map[string]interface{}{
		"message": fmt.Sprintf("Tabela '%s' removida com sucesso", input.Name),
	})
}

func (h *Handler) handleListData(req *pb.ActionRequest, tableName string) (*pb.ActionResponse, error) {
	// === VALIDAÇÃO GRANULAR DE PERMISSÃO ===
	if err := h.checkResourceAccess(req, tableName, "read"); err != nil {
		return respondErr(403, err.Error())
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	devData := h.getDevData(req.DeveloperId)
	table, exists := devData.Tables[tableName]
	if !exists {
		return respondErr(404, fmt.Sprintf("Tabela '%s' não encontrada", tableName))
	}

	return respondJSON(200, map[string]interface{}{
		"table": tableName,
		"rows":  table.Rows,
		"total": len(table.Rows),
	})
}

func (h *Handler) handleInsertData(req *pb.ActionRequest, tableName string) (*pb.ActionResponse, error) {
	// === VALIDAÇÃO GRANULAR DE PERMISSÃO ===
	if err := h.checkResourceAccess(req, tableName, "write"); err != nil {
		return respondErr(403, err.Error())
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	devData := h.getDevData(req.DeveloperId)
	table, exists := devData.Tables[tableName]
	if !exists {
		return respondErr(404, fmt.Sprintf("Tabela '%s' não encontrada", tableName))
	}

	var row Row
	if err := json.Unmarshal(req.Payload, &row); err != nil {
		return respondErr(400, "Payload inválido: "+err.Error())
	}

	row["id"] = table.NextID
	row["created_at"] = time.Now().UTC().Format(time.RFC3339)
	table.NextID++
	table.Rows = append(table.Rows, row)

	h.persist(req.DeveloperId)

	return respondJSON(201, map[string]interface{}{
		"message": "Registro inserido",
		"id":      row["id"],
		"table":   tableName,
	})
}

func (h *Handler) handleUpdateData(req *pb.ActionRequest, tableName, idStr string) (*pb.ActionResponse, error) {
	if err := h.checkResourceAccess(req, tableName, "write"); err != nil {
		return respondErr(403, err.Error())
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return respondErr(400, "ID inválido, deve ser um inteiro")
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	devData := h.getDevData(req.DeveloperId)
	table, exists := devData.Tables[tableName]
	if !exists {
		return respondErr(404, fmt.Sprintf("Tabela '%s' não encontrada", tableName))
	}

	var updateData Row
	if err := json.Unmarshal(req.Payload, &updateData); err != nil {
		return respondErr(400, "Payload inválido: "+err.Error())
	}

	for i, r := range table.Rows {
		// Conversão segura do ID pois r["id"] pode ser int ou float64 dependendo de como foi desserializado em outras partes
		rowID := -1
		switch v := r["id"].(type) {
		case int:
			rowID = v
		case float64:
			rowID = int(v)
		}

		if rowID == id {
			// Preservar ID e CreatedAt
			updateData["id"] = r["id"]
			updateData["created_at"] = r["created_at"]
			table.Rows[i] = updateData

			h.persist(req.DeveloperId)

			return respondJSON(200, map[string]interface{}{
				"message": "Registro atualizado",
				"id":      id,
			})
		}
	}
	return respondErr(404, "Registro não encontrado")
}

func (h *Handler) handleDeleteData(req *pb.ActionRequest, tableName, idStr string) (*pb.ActionResponse, error) {
	if err := h.checkResourceAccess(req, tableName, "write"); err != nil {
		return respondErr(403, err.Error())
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return respondErr(400, "ID inválido, deve ser um inteiro")
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	devData := h.getDevData(req.DeveloperId)
	table, exists := devData.Tables[tableName]
	if !exists {
		return respondErr(404, fmt.Sprintf("Tabela '%s' não encontrada", tableName))
	}

	for i, r := range table.Rows {
		rowID := -1
		switch v := r["id"].(type) {
		case int:
			rowID = v
		case float64:
			rowID = int(v)
		}

		if rowID == id {
			table.Rows = append(table.Rows[:i], table.Rows[i+1:]...)

			h.persist(req.DeveloperId)

			return respondJSON(200, map[string]interface{}{
				"message": "Registro excluído",
				"id":      id,
			})
		}
	}
	return respondErr(404, "Registro não encontrado")
}

func (h *Handler) handleListResources(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	devData := h.getDevData(req.DeveloperId)
	resources := make([]map[string]string, 0)
	for _, t := range devData.Tables {
		resources = append(resources, map[string]string{
			"id":    t.Name,
			"label": fmt.Sprintf("Tabela: %s (%d registros)", t.Name, len(t.Rows)),
		})
	}

	return respondJSON(200, map[string]interface{}{
		"resources": resources,
		"plugin":    "easy-crud",
	})
}

// ========================================================================
// Segurança — Validação granular de recursos
// ========================================================================

// checkResourceAccess verifica se a API Key tem permissão para o recurso (tabela).
// Se permissions_metadata está vazio, assume acesso total (wildcard).
// Se permissions_metadata contém o scope, verifica se a tabela está na lista.
func (h *Handler) checkResourceAccess(req *pb.ActionRequest, tableName, scope string) error {
	meta := req.PermissionsMetadata
	if meta == nil || len(meta) == 0 {
		// Sem restrições granulares — acesso total
		return nil
	}

	// Verificar se há restrição para este scope
	allowed, hasRestriction := meta[scope]
	if !hasRestriction {
		// Verificar se tem restrição no scope "admin" (que dá acesso total)
		if _, hasAdmin := meta["admin"]; hasAdmin {
			return nil
		}
		// Sem restrição para este scope especifico — negar por precaução
		return fmt.Errorf("API Key não tem permissão de '%s' para a tabela '%s'", scope, tableName)
	}

	// Verificar se a tabela está na lista de recursos permitidos
	tables := strings.Split(allowed, ",")
	for _, t := range tables {
		if strings.TrimSpace(t) == tableName || strings.TrimSpace(t) == "*" {
			return nil
		}
	}

	return fmt.Errorf("API Key não tem permissão de '%s' para a tabela '%s'. Tabelas permitidas: %s", scope, tableName, allowed)
}

// ========================================================================
// Utilitários
// ========================================================================

func respondJSON(status int, data interface{}) (*pb.ActionResponse, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return &pb.ActionResponse{
			StatusCode:   500,
			ErrorMessage: "Erro ao serializar resposta: " + err.Error(),
		}, nil
	}
	return &pb.ActionResponse{
		StatusCode: int32(status),
		Data:       jsonData,
	}, nil
}

func respondErr(status int, msg string) (*pb.ActionResponse, error) {
	return &pb.ActionResponse{
		StatusCode:   int32(status),
		ErrorMessage: msg,
	}, nil
}
