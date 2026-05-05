package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed all:static index.html
var content embed.FS

// Handler retorna um http.Handler que serve o frontend SPA.
// Arquivos estáticos são servidos de /static/*, qualquer outra rota recebe index.html (SPA fallback).
func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		// Tentar servir arquivo estático
		if path == "" {
			path = "index.html"
		}

		file, err := content.Open(path)
		if err != nil {
			// SPA fallback: retorna index.html para rotas desconhecidas
			data, _ := content.ReadFile("index.html")
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(data)
			return
		}
		file.Close()

		// Servir o arquivo encontrado
		http.FileServer(http.FS(content)).ServeHTTP(w, r)
	})
}

// StaticFS retorna o filesystem para uso independente.
func StaticFS() (fs.FS, error) {
	return fs.Sub(content, "static")
}
