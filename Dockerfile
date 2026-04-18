# Stage 1: Compilar el frontend (React/Vite)
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# Stage 2: Compilar el backend Go (modo servidor, sin Wails)
FROM golang:1.24-alpine AS backend-builder

WORKDIR /app

# SSL para conexiones a PostgreSQL/Supabase
RUN apk add --no-cache ca-certificates

# Descargar dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente (sin frontend/dist todavía)
COPY *.go ./

# Copiar el frontend compilado (el servidor lo sirve como static files)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Compilar con el build tag 'server' para excluir Wails
# El flag -tags server activa server_main.go y desactiva main.go (que importa Wails)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -tags server -ldflags="-s -w" -o master_sheep_server .


# Stage 3: Imagen final mínima
FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=backend-builder /app/master_sheep_server .
COPY --from=backend-builder /app/frontend/dist ./frontend/dist

ENV PORT=8080
ENV DATABASE_URL=""

EXPOSE 8080

CMD ["./master_sheep_server"]
