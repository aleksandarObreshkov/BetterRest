const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function mainHandlers() {
  const handlers = new Map();
  const executions = [];
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/index.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports: {}, AbortController,
    require: name => {
      if (name === 'electron') return { app: { on() {} }, ipcMain: { handle: (name, callback) => handlers.set(name, callback) } };
      if (name === 'electron-squirrel-startup') return false;
      if (name === './models/Request') return { Request: { fromJSON: value => value } };
      if (name === './requestHandler') return {
        handleHttpRequest: (request, signal) => new Promise((resolve, reject) => {
          executions.push({ request, signal, resolve, reject });
          signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
        }),
      };
      if (name.startsWith('.')) return {};
      return require(name);
    },
  });
  return { handlers, executions };
}

function event(id) {
  const sender = new EventEmitter();
  sender.id = id;
  return { sender };
}

test('cancellation is scoped to the execution and the originating window', async () => {
  const { handlers, executions } = mainHandlers();
  const firstWindow = event(1), otherWindow = event(2);
  const first = handlers.get('request')(firstWindow, {}, 'first');
  const second = handlers.get('request')(firstWindow, {}, 'second');
  handlers.get('cancel-request')(otherWindow, 'first');
  assert.equal(executions[0].signal.aborted, false);
  handlers.get('cancel-request')(firstWindow, 'first');
  assert.equal(executions[1].signal.aborted, false);
  assert.equal((await first).cancelled, true);
  executions[1].resolve({ body: 'done' });
  assert.equal((await second).body, 'done');
  assert.equal(firstWindow.sender.listenerCount('destroyed'), 0);
});

test('window destruction cancels pending requests and releases listeners', async () => {
  const { handlers } = mainHandlers();
  const window = event(1);
  const pending = handlers.get('request')(window, {}, 'execution');
  window.sender.emit('destroyed');
  assert.equal((await pending).cancelled, true);
  assert.equal(window.sender.listenerCount('destroyed'), 0);
});

test('failed executions are cleaned up and the same ID can be used again', async () => {
  const { handlers, executions } = mainHandlers();
  const window = event(1);
  const pending = handlers.get('request')(window, {}, 'execution');
  executions[0].reject(new Error('Network failure'));
  await assert.rejects(pending, /Network failure/);
  assert.equal(window.sender.listenerCount('destroyed'), 0);
  const retry = handlers.get('request')(window, {}, 'execution');
  executions[1].resolve({ body: 'ok' });
  assert.equal((await retry).body, 'ok');
});
