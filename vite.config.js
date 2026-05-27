import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const urlObj = new URL(req.url, 'http://localhost');
          const pathname = urlObj.pathname;

          if (pathname.startsWith('/api/')) {
            const apiName = pathname.slice(5).split('?')[0]; // strip query string
            try {
              const apiPath = `./api/${apiName}.js`;
              const apiModule = await server.ssrLoadModule(apiPath);
              const handler = apiModule.default;

              if (typeof handler === 'function') {
                // Mock Vercel request query params
                req.query = Object.fromEntries(urlObj.searchParams);

                // Mock Vercel response helper methods
                res.status = (code) => {
                  res.statusCode = code;
                  return res;
                };
                res.json = (data) => {
                  if (!res.writableEnded) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  }
                  return res;
                };

                await handler(req, res);
                return;
              }
            } catch (err) {
              console.error(`Error executing local API handler for /api/${apiName}:`, err);
              if (!res.writableEnded) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: { message: err.message } }));
              }
              return;
            }
          }
          next();
        });
      }
    }
  ],
})
