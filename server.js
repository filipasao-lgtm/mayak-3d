import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3000;
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  // Set CORS headers for audio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Add caching headers for better performance
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For client-side routing, serve index.html
      if (err.code === 'ENOENT' && !ext) {
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('File not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;

  // Open in default browser (silent - no console logs)
  const platform = process.platform;
  const command = 
    platform === 'win32' ? `start ${url}` :
    platform === 'darwin' ? `open ${url}` :
    `xdg-open ${url}`;

  exec(command, { windowsHide: true });
});
