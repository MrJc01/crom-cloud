package plugin_test

// =============================================================================
// TESTES: Plugin Echo (Plugin de Teste Base)
// =============================================================================

import (
	"encoding/json"
	"testing"
)

// TestEchoPluginPing verifica resposta básica do plugin echo
func TestEchoPluginPing(t *testing.T) {
	req := ActionRequest{
		Action: "ping",
		Method: "GET",
	}

	resp := handleEchoAction(req)

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want %d", resp.StatusCode, 200)
	}

	var data map[string]string
	json.Unmarshal(resp.Data, &data)

	if data["message"] != "pong" {
		t.Errorf("message = %q, want %q", data["message"], "pong")
	}
}

// TestEchoPluginReflect verifica que o echo retorna o payload recebido
func TestEchoPluginReflect(t *testing.T) {
	payload := map[string]interface{}{
		"test":   "value",
		"number": 42,
	}
	payloadJSON, _ := json.Marshal(payload)

	req := ActionRequest{
		Action:  "reflect",
		Method:  "POST",
		Payload: payloadJSON,
	}

	resp := handleEchoAction(req)

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want %d", resp.StatusCode, 200)
	}

	var data map[string]interface{}
	json.Unmarshal(resp.Data, &data)

	if data["received"] == nil {
		t.Error("campo 'received' ausente na resposta")
	}
}

// TestEchoPluginSecretsInjection verifica que secrets são recebidos
func TestEchoPluginSecretsInjection(t *testing.T) {
	req := ActionRequest{
		Action: "check-secrets",
		Method: "GET",
		Secrets: map[string]string{
			"test_key":    "test_value",
			"another_key": "another_value",
		},
	}

	resp := handleEchoAction(req)

	if resp.StatusCode != 200 {
		t.Errorf("status = %d, want %d", resp.StatusCode, 200)
	}

	var data map[string]interface{}
	json.Unmarshal(resp.Data, &data)

	secretCount := int(data["secret_count"].(float64))
	if secretCount != 2 {
		t.Errorf("secret_count = %d, want %d", secretCount, 2)
	}
}

// TestEchoPluginUnknownAction verifica resposta para ação desconhecida
func TestEchoPluginUnknownAction(t *testing.T) {
	req := ActionRequest{
		Action: "nonexistent",
		Method: "GET",
	}

	resp := handleEchoAction(req)

	if resp.StatusCode != 404 {
		t.Errorf("status = %d, want %d", resp.StatusCode, 404)
	}
	if resp.ErrorMessage == "" {
		t.Error("error_message deveria conter descrição do erro")
	}
}

// =============================================================================
// HELPERS (Simulação do plugin echo)
// =============================================================================

type ActionRequest struct {
	Action      string
	Method      string
	Payload     []byte
	Headers     map[string]string
	Secrets     map[string]string
	DeveloperID string
}

type ActionResponse struct {
	StatusCode   int
	Data         []byte
	ErrorMessage string
}

func handleEchoAction(req ActionRequest) ActionResponse {
	switch req.Action {
	case "ping":
		data, _ := json.Marshal(map[string]string{"message": "pong"})
		return ActionResponse{StatusCode: 200, Data: data}

	case "reflect":
		data, _ := json.Marshal(map[string]interface{}{
			"received": json.RawMessage(req.Payload),
			"method":   req.Method,
		})
		return ActionResponse{StatusCode: 200, Data: data}

	case "check-secrets":
		data, _ := json.Marshal(map[string]interface{}{
			"secret_count": len(req.Secrets),
			"has_secrets":  len(req.Secrets) > 0,
		})
		return ActionResponse{StatusCode: 200, Data: data}

	default:
		return ActionResponse{
			StatusCode:   404,
			ErrorMessage: "Ação desconhecida: " + req.Action,
		}
	}
}
