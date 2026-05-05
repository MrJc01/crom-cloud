.PHONY: build clean test

BINARY=supabase-admin

build:
	go build -o $(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./... -v
