package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
)

// ========================================================================
// Persistence Engine — Armazenamento criptografado por developer
// ========================================================================
//
// Cada developer tem seus dados salvos em um arquivo separado:
//   data/<developer_id>.dat
//
// Se VAULT_KEY estiver definida (32 bytes hex = 64 chars), os dados são
// criptografados em repouso com AES-256-GCM. Caso contrário (modo dev),
// os dados são salvos como JSON puro.
//
// O diretório data/ é criado automaticamente ao lado do binário do plugin.

const dataDirName = "data"

// persistedData é o formato serializado para disco.
type persistedData struct {
	Tables map[string]*Table `json:"tables"`
}

// getDataDir retorna o caminho absoluto do diretório de dados,
// relativo ao diretório do executável do plugin (não ao CWD).
// Isso garante que os dados fiquem em plugins/easy-crud/data/
// mesmo quando o Core inicia o plugin como subprocesso.
func getDataDir() string {
	exePath, err := os.Executable()
	if err != nil {
		// Fallback para CWD se não conseguir resolver
		return dataDirName
	}
	return filepath.Join(filepath.Dir(exePath), dataDirName)
}

// ensureDataDir cria o diretório de dados se não existir.
func ensureDataDir() error {
	return os.MkdirAll(getDataDir(), 0700)
}

// devFilePath retorna o caminho do arquivo de dados para um developer.
func devFilePath(devID string) string {
	// Sanitizar o devID para evitar path traversal
	safe := filepath.Base(devID)
	return filepath.Join(getDataDir(), safe+".dat")
}

// ========================================================================
// Criptografia AES-256-GCM
// ========================================================================

// getVaultKey lê a chave mestra do ambiente.
// Retorna nil se não estiver configurada (modo dev = sem criptografia).
func getVaultKey() []byte {
	hexKey := os.Getenv("VAULT_KEY")
	if hexKey == "" {
		return nil
	}
	key, err := hex.DecodeString(hexKey)
	if err != nil || len(key) != 32 {
		log.Printf("[persistence] VAULT_KEY inválida (esperado 32 bytes hex). Persistindo sem criptografia.")
		return nil
	}
	return key
}

// encrypt criptografa dados com AES-256-GCM.
// Formato do output: nonce (12 bytes) || ciphertext
func encrypt(plaintext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes.NewCipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("cipher.NewGCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("crypto/rand: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// decrypt descriptografa dados com AES-256-GCM.
// Espera o formato: nonce (12 bytes) || ciphertext
func decrypt(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes.NewCipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("cipher.NewGCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("dados corrompidos: menor que nonce size")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("gcm.Open: %w (dados corrompidos ou chave errada)")
	}
	return plaintext, nil
}

// ========================================================================
// Save / Load — Interface pública
// ========================================================================

// SaveDevData serializa os dados do developer e grava no disco.
// Se VAULT_KEY estiver disponível, criptografa. Caso contrário, salva JSON puro.
func SaveDevData(devID string, devData *DeveloperData) error {
	if err := ensureDataDir(); err != nil {
		return fmt.Errorf("ensureDataDir: %w", err)
	}

	pd := &persistedData{
		Tables: devData.Tables,
	}

	jsonBytes, err := json.Marshal(pd)
	if err != nil {
		return fmt.Errorf("json.Marshal: %w", err)
	}

	var dataToWrite []byte
	key := getVaultKey()
	if key != nil {
		dataToWrite, err = encrypt(jsonBytes, key)
		if err != nil {
			return fmt.Errorf("encrypt: %w", err)
		}
	} else {
		// Modo dev: salvar JSON puro
		dataToWrite = jsonBytes
	}

	filePath := devFilePath(devID)
	// Gravar atomicamente: escrever em tmp e renomear (evita corrupção em crash)
	tmpPath := filePath + ".tmp"
	if err := os.WriteFile(tmpPath, dataToWrite, 0600); err != nil {
		return fmt.Errorf("WriteFile: %w", err)
	}
	if err := os.Rename(tmpPath, filePath); err != nil {
		return fmt.Errorf("Rename: %w", err)
	}

	return nil
}

// LoadDevData lê os dados do developer do disco.
// Retorna nil se o arquivo não existir (developer novo).
func LoadDevData(devID string) (*DeveloperData, error) {
	filePath := devFilePath(devID)

	rawData, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // Arquivo não existe = developer novo, sem dados
		}
		return nil, fmt.Errorf("ReadFile: %w", err)
	}

	if len(rawData) == 0 {
		return nil, nil
	}

	var jsonBytes []byte
	key := getVaultKey()
	if key != nil {
		jsonBytes, err = decrypt(rawData, key)
		if err != nil {
			// Tenta ler como JSON puro (migração de modo dev → produção)
			log.Printf("[persistence] Falha ao descriptografar %s, tentando como JSON puro: %v", devID, err)
			jsonBytes = rawData
		}
	} else {
		jsonBytes = rawData
	}

	var pd persistedData
	if err := json.Unmarshal(jsonBytes, &pd); err != nil {
		return nil, fmt.Errorf("json.Unmarshal: %w", err)
	}

	devData := &DeveloperData{
		Tables: pd.Tables,
	}

	// Garantir que o mapa não é nil
	if devData.Tables == nil {
		devData.Tables = make(map[string]*Table)
	}

	// Garantir que Rows não é nil em nenhuma tabela
	for _, t := range devData.Tables {
		if t.Rows == nil {
			t.Rows = []Row{}
		}
	}

	return devData, nil
}
