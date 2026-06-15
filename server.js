const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PORT = 8080;
const DIR  = __dirname;

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json', '.ico': 'image/x-icon',
};

// Get local network IPs (for mobile access on same WiFi)
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const n of iface) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  return ips;
}

http.createServer((req, res) => {

  // ── API proxy: /api/* → https://api.football-data.org/v4/*
  if (req.url.startsWith('/api/')) {
    const apiPath = req.url.slice(4);   // /competitions/WC/matches
    const target  = 'https://api.football-data.org/v4' + apiPath;
    const apiKey  = req.headers['x-auth-token'] || '';

    https.get(target, { headers: { 'X-Auth-Token': apiKey } }, (pr) => {
      const chunks = [];
      pr.on('data', c => chunks.push(c));
      pr.on('end', () => {
        res.writeHead(pr.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(Buffer.concat(chunks));
      });
    }).on('error', e => {
      res.writeHead(502);
      res.end(JSON.stringify({ message: 'Proxy error: ' + e.message }));
    });
    return;
  }

  // ── Static files
  const filePath = path.join(DIR, req.url === '/' ? '/index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n✅  World Cup Family Challenge is running!\n');
  console.log(`    💻  On this PC       →  http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`    📱  On phones/tablets →  http://${ip}:${PORT}`);
  });
  console.log('\n    Press Ctrl+C to stop.\n');
});
