# TexTradeOS PRO Frontend

React, Vite, Tailwind, and PWA frontend for TexTradeOS PRO, a product of SparkPair.

## Development

```powershell
npm install
npm run dev
```

Set `VITE_API_URL` when the API is not available at `/api`.

## Production

The Docker image builds the frontend without source maps and serves it with
Nginx over HTTPS on port `8443`; HTTP port `8080` redirects to HTTPS. Nginx
proxies same-origin `/api` requests to the private backend container and falls
back to `index.html` for React routes. The Windows launcher creates the LAN
certificate automatically.

```powershell
docker build -t textradeos-frontend:test .
```

Production releases are orchestrated from the backend repository.
