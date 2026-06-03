const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const html = fs.readFileSync('F:\\projects\\traveler-passport\\.kilo\\plans\\debug-map.html', 'utf8');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});
server.listen(9876, () => {
  console.log('Server on 9876');
});
