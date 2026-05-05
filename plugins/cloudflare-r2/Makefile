.PHONY: build clean test

BINARY=cloudflare-r2

build:
	go build -o $(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./... -v
