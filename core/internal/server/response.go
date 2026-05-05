package server

import (
	"encoding/json"
	"net/http"
)

// APIResponse é o formato padrão de resposta do Crom Cloud.
type APIResponse struct {
	Success bool           `json:"success"`
	Data    interface{}    `json:"data,omitempty"`
	Error   *APIError      `json:"error,omitempty"`
	Meta    *ResponseMeta  `json:"meta,omitempty"`
}

// APIError representa um erro padronizado.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Plugin  string `json:"plugin,omitempty"`
}

// ResponseMeta contém metadados da resposta.
type ResponseMeta struct {
	Plugin           string `json:"plugin,omitempty"`
	CreditsConsumed  int    `json:"credits_consumed,omitempty"`
	CreditsRemaining int    `json:"credits_remaining,omitempty"`
	RequestID        string `json:"request_id,omitempty"`
	LatencyMs        int64  `json:"latency_ms,omitempty"`
}

// WriteJSON escreve uma resposta JSON padronizada.
func WriteJSON(w http.ResponseWriter, status int, resp APIResponse) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// WriteSuccess escreve uma resposta de sucesso.
func WriteSuccess(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    data,
	})
}

// WriteError escreve uma resposta de erro padronizada.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}
