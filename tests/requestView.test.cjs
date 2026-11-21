const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object') return [];
  return [node, ...flatten(node.props?.children)];
}

function mountView() {
  const slots = [], intervals = new Map(), calls = [], alerts = [];
  let index = 0, now = 0, cleanup, settle, fail;
  const pending = new Promise((resolve, reject) => { settle = resolve; fail = reject; });
  const module = { exports: {} };
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = index++;
      return slots[i] ??= { current: initial };
    },
    useEffect(effect) {
      const i = index++;
      if (!(i in slots)) { slots[i] = true; cleanup = effect(); }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const api = {
    executeRequest: (...args) => { calls.push(['execute', ...args]); return pending; },
    cancelRequest: async id => { calls.push(['cancel', id]); },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/RequestView.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module, exports: module.exports,
    crypto: { randomUUID: () => 'execution-id' }, performance: { now: () => now },
    setInterval: callback => { const id = Symbol(); intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    window: { api, alert: message => alerts.push(message) },
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '../models/Request') return { Request: class { toJSON() { return { url: 'http://example.test' }; } } };
      return { default: name, RequestButton: 'RequestButton' };
    },
  });
  const render = () => {
    index = 0;
    return flatten(module.exports.default({ requestId: 'request-id', name: 'Example', url: 'http://example.test', method: 'GET', headers: [] }));
  };
  return {
    render, calls, api, intervals, alerts, settle, fail, unmount: () => cleanup(),
    advance(ms) { now += ms; intervals.forEach(callback => callback()); },
    button: () => render().find(node => node.type === 'RequestButton').props,
  };
}

test('shows live elapsed time, prevents duplicate sends, and retains the final duration', async () => {
  const view = mountView();
  assert.equal(view.render().some(node => node.props?.role === 'timer'), false);
  const pending = view.button().executeRequest();
  assert.equal(view.button().loading, true);
  await view.button().executeRequest();
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0][2], 'request-id:execution-id');
  view.advance(1250);
  assert.equal(view.render().find(node => node.props?.role === 'timer').props.children.join(''), '1.3 s');
  view.settle({ body: 'done', contentType: 'text/plain', headers: {} });
  await pending;
  assert.equal(view.button().loading, false);
  assert.equal(view.intervals.size, 0);
  assert.equal(view.render().find(node => node.type === './ResponseView').props.body, 'done');
  assert.equal(view.render().find(node => node.props?.role === 'timer').props.children.join(''), '1.3 s');
});

test('cancels the correct execution and displays cancellation without an error', async () => {
  const view = mountView();
  const pending = view.button().executeRequest();
  await view.button().cancelRequest();
  await view.button().cancelRequest();
  assert.deepEqual(view.calls[1], ['cancel', view.calls[0][2]]);
  assert.equal(view.calls.length, 2);
  view.settle({ cancelled: true });
  await pending;
  assert.equal(view.button().loading, false);
  assert.equal(view.intervals.size, 0);
  assert.equal(view.render().find(node => node.type === './ResponseView').props.body, 'Request cancelled.');
});

test('stops the timer and enables sending again after a network error', async () => {
  const view = mountView();
  const pending = view.button().executeRequest();
  view.fail(new Error('Connection lost'));
  await pending;
  assert.equal(view.button().loading, false);
  assert.equal(view.intervals.size, 0);
  assert.equal(view.render().find(node => node.type === './ResponseView').props.body, 'Error: Connection lost');
});

test('cancels on unmount and ignores late responses', async () => {
  const view = mountView();
  const pending = view.button().executeRequest();
  view.unmount();
  assert.deepEqual(view.calls[1], ['cancel', view.calls[0][2]]);
  assert.equal(view.intervals.size, 0);
  view.settle({ body: 'late response' });
  await pending;
  assert.equal(view.render().find(node => node.type === './ResponseView').props.body, '');
});
