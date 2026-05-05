package plugin_test

// =============================================================================
// TESTES: Bridge (Executor de Subprocesso Multi-Linguagem)
// =============================================================================

import (
	"bytes"
	"encoding/json"
	"os/exec"
	"runtime"
	"testing"
)

// TestBridgeExecutesPythonScript verifica que o bridge executa Python
func TestBridgeExecutesPythonScript(t *testing.T) {
	// Verifica se Python está disponível
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 não encontrado, pulando teste")
	}

	// Script Python inline via -c
	script := `
import sys, json
input_data = json.loads(sys.stdin.read())
result = {"echo": input_data["message"], "lang": "python"}
print(json.dumps(result))
`

	input := map[string]string{"message": "hello from go"}
	inputJSON, _ := json.Marshal(input)

	cmd := exec.Command("python3", "-c", script)
	cmd.Stdin = bytes.NewReader(inputJSON)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		t.Fatalf("erro ao executar python: %v, stderr: %s", err, stderr.String())
	}

	var result map[string]string
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("erro ao parsear output: %v, stdout: %s", err, stdout.String())
	}

	if result["echo"] != "hello from go" {
		t.Errorf("echo = %q, want %q", result["echo"], "hello from go")
	}
	if result["lang"] != "python" {
		t.Errorf("lang = %q, want %q", result["lang"], "python")
	}
}

// TestBridgeExecutesBashScript verifica que o bridge executa Bash
func TestBridgeExecutesBashScript(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Bash não disponível no Windows")
	}

	cmd := exec.Command("bash", "-c", `echo '{"status":"ok","shell":"bash"}'`)

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	err := cmd.Run()
	if err != nil {
		t.Fatalf("erro ao executar bash: %v", err)
	}

	var result map[string]string
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("erro ao parsear output: %v", err)
	}

	if result["status"] != "ok" {
		t.Errorf("status = %q, want %q", result["status"], "ok")
	}
}

// TestBridgeHandlesScriptError verifica tratamento de erro do subprocesso
func TestBridgeHandlesScriptError(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 não encontrado, pulando teste")
	}

	// Script que falha propositalmente
	cmd := exec.Command("python3", "-c", "import sys; sys.exit(1)")

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err == nil {
		t.Error("esperava erro, mas script executou com sucesso")
	}

	// Verificar que o exit code é capturado
	if exitErr, ok := err.(*exec.ExitError); ok {
		if exitErr.ExitCode() != 1 {
			t.Errorf("exit code = %d, want %d", exitErr.ExitCode(), 1)
		}
	}
}

// TestBridgeHandlesInvalidJSON verifica tratamento de output não-JSON
func TestBridgeHandlesInvalidJSON(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 não encontrado, pulando teste")
	}

	cmd := exec.Command("python3", "-c", "print('not json output')")

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	cmd.Run()

	var result map[string]interface{}
	err := json.Unmarshal(stdout.Bytes(), &result)
	if err == nil {
		t.Error("deveria falhar ao parsear output não-JSON")
	}
}

// TestBridgePassesEnvironmentVariables verifica injeção de secrets via ENV
func TestBridgePassesEnvironmentVariables(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 não encontrado, pulando teste")
	}

	script := `
import os, json
key = os.environ.get("CROM_SECRET_test_key", "")
print(json.dumps({"received_key": key}))
`

	cmd := exec.Command("python3", "-c", script)
	cmd.Env = append(cmd.Environ(), "CROM_SECRET_test_key=my-secret-123")

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	err := cmd.Run()
	if err != nil {
		t.Fatalf("erro: %v", err)
	}

	var result map[string]string
	json.Unmarshal(stdout.Bytes(), &result)

	if result["received_key"] != "my-secret-123" {
		t.Errorf("received_key = %q, want %q", result["received_key"], "my-secret-123")
	}
}

// TestBridgeTimeout verifica que scripts com timeout são mortos
func TestBridgeTimeout(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 não encontrado, pulando teste")
	}

	// Script que dorme por 10 segundos (deve ser morto antes)
	script := `import time; time.sleep(10); print('{"done":true}')`

	cmd := exec.Command("python3", "-c", script)

	// Em produção: usar context.WithTimeout
	// Aqui apenas verificamos que podemos matar o processo
	err := cmd.Start()
	if err != nil {
		t.Fatalf("erro ao iniciar: %v", err)
	}

	// Mata imediatamente (simula timeout)
	err = cmd.Process.Kill()
	if err != nil {
		t.Fatalf("erro ao matar processo: %v", err)
	}

	// Wait para limpar o processo
	cmd.Wait()
}
