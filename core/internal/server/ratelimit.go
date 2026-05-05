package server

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimiter implementa rate limiting via Redis com sliding window.
type RateLimiter struct {
	rdb          *redis.Client
	defaultLimit int
	windowSecs   int
}

// NewRateLimiter cria um novo rate limiter.
func NewRateLimiter(rdb *redis.Client, defaultLimit int) *RateLimiter {
	if defaultLimit <= 0 {
		defaultLimit = 60
	}
	return &RateLimiter{
		rdb:          rdb,
		defaultLimit: defaultLimit,
		windowSecs:   60, // janela de 1 minuto
	}
}

// RateLimitByIPMiddleware limita requisições por endereço IP.
func (rl *RateLimiter) RateLimitByIPMiddleware(limit int) func(http.Handler) http.Handler {
	if limit <= 0 {
		limit = 1000 // 1000 req/min por IP
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = forwarded
			}

			key := fmt.Sprintf("ratelimit:ip:%s", ip)
			allowed, remaining, resetAt := rl.checkLimit(r.Context(), key, limit)

			// Sempre incluir headers de rate limit
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetAt, 10))

			if !allowed {
				retryAfter := resetAt - time.Now().Unix()
				if retryAfter < 1 {
					retryAfter = 1
				}
				w.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))
				WriteError(w, http.StatusTooManyRequests, "RATE_LIMITED",
					"Limite de requisições excedido. Tente novamente em breve.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimitByKeyMiddleware limita requisições por API Key ID.
func (rl *RateLimiter) RateLimitByKeyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// O limite por key é verificado dentro do auth middleware
		// Este middleware é um placeholder para integração futura
		// com o campo rate_limit_rpm de cada API Key
		next.ServeHTTP(w, r)
	})
}

// CheckKeyRateLimit verifica o rate limit para uma API Key específica.
// Retorna (permitido, remaining, resetTimestamp).
func (rl *RateLimiter) CheckKeyRateLimit(ctx context.Context, keyID string, limit int) (bool, int, int64) {
	if rl.rdb == nil {
		return true, limit, 0
	}
	key := fmt.Sprintf("ratelimit:key:%s", keyID)
	return rl.checkLimit(ctx, key, limit)
}

// checkLimit implementa o rate limiting com counter + TTL no Redis.
func (rl *RateLimiter) checkLimit(ctx context.Context, key string, limit int) (bool, int, int64) {
	if rl.rdb == nil {
		return true, limit, 0 // Sem Redis = sem rate limit
	}

	now := time.Now()
	windowKey := fmt.Sprintf("%s:%d", key, now.Unix()/int64(rl.windowSecs))
	resetAt := ((now.Unix() / int64(rl.windowSecs)) + 1) * int64(rl.windowSecs)

	pipe := rl.rdb.Pipeline()
	incrCmd := pipe.Incr(ctx, windowKey)
	pipe.Expire(ctx, windowKey, time.Duration(rl.windowSecs)*time.Second)
	_, err := pipe.Exec(ctx)

	if err != nil {
		// Se Redis falhar, permitir (fail-open)
		return true, limit, resetAt
	}

	count := int(incrCmd.Val())
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}

	return count <= limit, remaining, resetAt
}
