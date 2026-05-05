.PHONY: build clean test

BINARY=vercel-manager

build:
	go build -o $(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./... -v
