const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { once } = require('node:events');
const { gzipSync } = require('node:zlib');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};

const { sendHttpRequest } = require('../src/utils/httpTransport.ts');
const { handleHttpRequest } = require('../src/requestHandler.ts');
const { Request } = require('../src/models/Request.ts');
const { ClientCredentialsAuthentication } = require('../src/models/Authentication.ts');

async function serverFor(t, handler) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('waits for a slow response with the socket timeout disabled', async t => {
  const url = await serverFor(t, (_req, res) => setTimeout(() => res.end('slow response'), 150));
  const original = http.request;
  const timeouts = [];
  http.request = (...args) => {
    const req = original(...args);
    const setTimeout = req.setTimeout.bind(req);
    req.setTimeout = (...args) => { timeouts.push(args[0]); return setTimeout(...args); };
    return req;
  };
  t.after(() => { http.request = original; });
  const result = await sendHttpRequest(url, { method: 'GET', headers: {} });
  assert.equal(result.body, 'slow response');
  assert.deepEqual(timeouts, [0]);
});

for (const streaming of [false, true]) {
  test(`cancels while waiting for ${streaming ? 'the response body' : 'response headers'} and closes the connection`, async t => {
    let received;
    const ready = new Promise(resolve => { received = resolve; });
    let closed;
    const connectionClosed = new Promise(resolve => { closed = resolve; });
    const url = await serverFor(t, (_req, res) => {
      res.on('close', closed);
      if (streaming) res.write('partial body');
      received();
    });
    const controller = new AbortController();
    const pending = sendHttpRequest(url, { method: 'GET', headers: {}, signal: controller.signal });
    await ready;
    controller.abort();
    await assert.rejects(pending, error => error.name === 'AbortError');
    await connectionClosed;
  });
}

test('does not send an already-cancelled request', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(sendHttpRequest('http://127.0.0.1:1', {
    method: 'GET', headers: {}, signal: controller.signal,
  }), error => error.name === 'AbortError');
});

test('follows redirects and decodes compressed UTF-8 responses', async t => {
  const url = await serverFor(t, (req, res) => {
    if (req.url === '/') {
      res.writeHead(302, { location: '/result' });
      res.end();
    } else {
      assert.equal(req.method, 'GET');
      res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': 'gzip', 'x-test': 'present' });
      res.end(gzipSync('Hello 🌍'));
    }
  });
  const result = await sendHttpRequest(url, { method: 'POST', headers: {}, body: 'payload' });
  assert.equal(result.body, 'Hello 🌍');
  assert.equal(result.status, 200);
  assert.equal(result.contentType, 'text/plain');
  assert.equal(result.headers['x-test'], 'present');
});

test('preserves the method and body for 307 redirects', async t => {
  const url = await serverFor(t, (req, res) => {
    if (req.url === '/') {
      res.writeHead(307, { location: '/result' });
      res.end();
    } else {
      assert.equal(req.method, 'POST');
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => res.end(body));
    }
  });
  assert.equal((await sendHttpRequest(url, { method: 'POST', headers: {}, body: 'payload' })).body, 'payload');
});

test('does not forward credentials to a different origin on redirect', async t => {
  const destination = await serverFor(t, (req, res) => {
    assert.equal(req.headers.authorization, undefined);
    assert.equal(req.headers.cookie, undefined);
    res.end('ok');
  });
  const url = await serverFor(t, (_req, res) => {
    res.writeHead(302, { location: destination });
    res.end();
  });
  await sendHttpRequest(url, { method: 'GET', headers: { Authorization: 'Bearer secret', Cookie: 'secret=value' } });
});

test('reports truncated response bodies instead of hanging', async t => {
  const url = await serverFor(t, (_req, res) => {
    res.write('partial');
    setImmediate(() => res.destroy());
  });
  await assert.rejects(sendHttpRequest(url, { method: 'GET', headers: {} }));
});

test('cancelling during OAuth token fetching prevents the API request', async t => {
  let received;
  const ready = new Promise(resolve => { received = resolve; });
  let apiRequests = 0;
  const url = await serverFor(t, (req, res) => {
    if (req.url === '/token') received();
    else { apiRequests++; res.end('unexpected'); }
  });
  const auth = new ClientCredentialsAuthentication();
  Object.assign(auth, { clientId: 'client', clientSecret: 'secret', oauthUrl: `${url}/token` });
  const controller = new AbortController();
  const pending = handleHttpRequest(new Request(`${url}/api`, 'GET', new Map(), auth), controller.signal);
  await ready;
  controller.abort();
  await assert.rejects(pending);
  assert.equal(apiRequests, 0);
});
