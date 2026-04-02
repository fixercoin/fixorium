# fixorium/Makefile

PACKAGE := github.com/fixorium/chain
BINARY := fixoriumd

build:
	go build -o build/$(BINARY) ./cmd/$(BINARY)

install:
	go install ./cmd/$(BINARY)

clean:
	rm -rf build/

init:
	$(BINARY) init fixorium-node --chain-id fixorium-1122
	$(BINARY) keys add validator
	$(BINARY) add-genesis-account validator 100000000000fxm
	$(BINARY) gentx validator 1000000000fxm --chain-id fixorium-1122
	$(BINARY) collect-gentxs

start:
	$(BINARY) start

docker-build:
	docker build -t fixorium-chain .

docker-run:
	docker run -d -p 26657:26657 -p 26656:26656 -p 1317:1317 -p 9090:9090 -p 8545:8545 -p 8546:8546 --name fixorium-node fixorium-chain
