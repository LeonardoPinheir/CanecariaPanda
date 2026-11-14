import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Em desenvolvimento, /api é atendido pelo mesmo código da função da Vercel.
const apiDev = {
  name: 'api-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      const { handle } = await server.ssrLoadModule('/server/handler.js');
      handle(req, res);
    });
  },
};

export default defineConfig({ plugins: [react(), tailwindcss(), apiDev] });
