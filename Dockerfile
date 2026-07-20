# Stage 1: Build Frontend (React + Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go Backend (Headless API Server)
FROM golang:alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -tags server -ldflags="-s -w" -o /app/server .

# Stage 3: Final Production Image (Minimal Alpine ~20MB)
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /app/server ./server
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8080
ENV PORT=8080

CMD ["./server"]
