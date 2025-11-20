const http = require('http');
const url = 'http://127.0.0.1:3000/__health';
http.get(url, (res) => {
  console.log('STATUS', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('BODY', data));
}).on('error', (err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
