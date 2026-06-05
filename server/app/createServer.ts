import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

import {registerRoutes} from './registerRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();

  app.use(express.json());
  app.use('/api', registerRoutes());

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

