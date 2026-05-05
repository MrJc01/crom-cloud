.PHONY: build clean test

BINARY=github-actions

build:
	go build -o $(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./... -v
