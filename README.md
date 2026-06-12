# TexTradeOS Frontend

React, Vite, Tailwind, and PWA frontend for TexTradeOS.

## Development

```powershell
npm install
npm run dev
```

Set `VITE_API_URL` when the API is not available at `/api`.

## Production

The Docker image builds the frontend without source maps and serves it with
Nginx on port `8080`. Nginx proxies same-origin `/api` requests to the private
backend container and falls back to `index.html` for React routes.

```powershell
docker build -t textradeos-frontend:test .
```

Production releases are orchestrated from the backend repository.
