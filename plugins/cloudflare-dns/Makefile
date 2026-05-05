.PHONY: build clean test

BINARY=cloudflare-dns

build:
	go build -o $(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./... -v
