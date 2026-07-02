import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { loadBrowserResponseSource } from './browserSource';

async function withServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
  run: (url: string) => Promise<void>,
) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const port = (address as AddressInfo).port;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('loads HTML response source', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>Source</title>');
    },
    async (url) => {
      const result = await loadBrowserResponseSource({ url });

      assert.equal(result.ok, true);
      assert.equal(result.kind, 'response-source');
      assert.equal(result.url, url);
      assert.equal(result.finalUrl, new URL(url).href);
      assert.equal(result.source, '<!doctype html><title>Source</title>');
      assert.match(result.contentType ?? '', /text\/html/);
      assert.equal(result.byteCount, Buffer.byteLength('<!doctype html><title>Source</title>'));
    },
  );
});

test('rejects non-http protocols', async () => {
  const result = await loadBrowserResponseSource({ url: 'file:///D:/demo/index.html' });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'unavailable');
  assert.match(result.error ?? '', /Only http and https URLs/);
});

test('rejects non-html responses', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    },
    async (url) => {
      const result = await loadBrowserResponseSource({ url });

      assert.equal(result.ok, false);
      assert.equal(result.kind, 'unavailable');
      assert.match(result.error ?? '', /Expected HTML/);
    },
  );
});

test('enforces max byte limit', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>large</html>');
    },
    async (url) => {
      const result = await loadBrowserResponseSource({ url, maxBytes: 4 });

      assert.equal(result.ok, false);
      assert.equal(result.kind, 'unavailable');
      assert.match(result.error ?? '', /exceeds 4 bytes/);
    },
  );
});
