FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache openssl \
  && mkdir -p /etc/nginx/tls \
  && openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
       -keyout /etc/nginx/tls/server.key \
       -out /etc/nginx/tls/server.crt \
       -subj "/CN=TexTradeOS LAN" \
       -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
EXPOSE 8443
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- --no-check-certificate https://127.0.0.1:8443/ >/dev/null || exit 1
