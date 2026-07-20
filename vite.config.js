import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Vite plugin: auto-export serial data to a local JSON file
function serialExportPlugin() {
  const exportPath = path.resolve(__dirname, 'serial_export.json');

  return {
    name: 'serial-export',
    configureServer(server) {
      server.middlewares.use('/api/export', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              // Validate it's real JSON before writing
              JSON.parse(body);
              fs.writeFileSync(exportPath, body, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [serialExportPlugin()],
});
