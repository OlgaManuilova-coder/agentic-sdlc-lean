// Tiny HTTP server: POST /api/quote returns totals; GET / serves the quote page. No dependencies.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { InvoiceError, quoteInvoice } from './invoice.mjs';

const PORT = Number(process.env.PORT || 3000);
const page = new URL('../public/index.html', import.meta.url);

export function handler() {
  return async (req, res) => {
    try {
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(await readFile(page));
      }
      if (req.method === 'POST' && req.url === '/api/quote') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const { lines } = JSON.parse(body || '{}');
        const quote = quoteInvoice(lines); // compute before sending headers, so errors can still return 400
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(quote));
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      const status = e instanceof InvoiceError || e instanceof SyntaxError ? 400 : 500;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: status === 400 ? e.message : 'internal error' }));
    }
  };
}

if (process.argv[1]?.endsWith('server.mjs')) {
  createServer(handler()).listen(PORT, () => console.log(`Invoice app on http://localhost:${PORT}`));
}
