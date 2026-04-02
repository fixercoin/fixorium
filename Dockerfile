# fixorium/Dockerfile

FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git make

# Copy source code
COPY . .

# Build the binary
RUN make build

# Final stage
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /root/

COPY --from=builder /app/build/fixoriumd /usr/local/bin/

EXPOSE 26657 26656 1317 9090 8545 8546

CMD ["fixoriumd", "start"]
