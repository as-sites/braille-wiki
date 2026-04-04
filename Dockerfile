# ── Stage 1: build the static site ──────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdocs build --strict

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
# Traefik (the reverse proxy) sits in front; nginx is the static file origin.
FROM nginx:1.27-alpine

# Remove the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built site
COPY --from=builder /build/site /usr/share/nginx/html

# Railway injects $PORT; nginx must listen on it.
# We replace the default port 80 with the value of $PORT at container start.
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
