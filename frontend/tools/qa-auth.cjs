// Run after npm run build. Uses an installed Chromium browser and Node built-ins only.
// API responses are isolated fixtures; this check never writes to the real backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist/frontend/browser');
const browserPath =
  process.env.QA_CHROME ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find((p) => fs.existsSync(p));
if (!browserPath) throw new Error('Set QA_CHROME to an installed Chromium browser.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'agendacare-qa-'));
const output = path.resolve(__dirname, '../.qa-auth');
fs.mkdirSync(output, { recursive: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const user = {
  id: 7,
  nome: 'Pessoa de Teste',
  email: 'teste@example.com',
  createdAt: '2026-01-01T00:00:00Z',
};
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '7', exp: Math.floor(Date.now() / 1000) + 900 })}.test-only-signature`;
const session = { accessToken: token, tokenType: 'Bearer', expiresIn: 900, usuario: user };
let protectedStatus = 200;
const requests = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403);
    res.end();
    return;
  }
  const target =
    fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
  const mime =
    { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[
      path.extname(target)
    ] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(target).pipe(res);
});
let browser, ws;
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let port;
  for (let i = 0; i < 100; i++) {
    const active = path.join(profile, 'DevToolsActivePort');
    if (fs.existsSync(active)) {
      port = fs.readFileSync(active, 'utf8').split('\n')[0];
      break;
    }
    await pause(100);
  }
  if (!port) throw new Error('Browser debugging port unavailable.');
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Timeout: ' + method));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const errors = [];
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        pending.delete(msg.id);
        msg.error ? p.reject(msg.error) : p.resolve(msg.result);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const url = new URL(request.url);
      const publicRequest = url.pathname.startsWith('/api/auth/');
      const headers = request.headers;
      const authorization = Object.entries(headers).find(
        ([name]) => name.toLowerCase() === 'authorization',
      )?.[1];
      if (request.method !== 'OPTIONS') {
        requests.push({
          path: url.pathname,
          method: request.method,
          authorized: authorization === `Bearer ${token}`,
        });
        if (publicRequest) assert(!authorization, 'Token attached to public auth endpoint');
        else assert.equal(authorization, `Bearer ${token}`, 'Protected request missing token');
      }
      if (url.pathname === '/api/auth/register' && request.method === 'POST') {
        assert.deepEqual(Object.keys(JSON.parse(request.postData)).sort(), [
          'email',
          'nome',
          'senha',
        ]);
      }
      const code =
        request.method === 'OPTIONS'
          ? 204
          : publicRequest
            ? url.pathname.endsWith('/register')
              ? 201
              : 200
            : protectedStatus;
      const body = publicRequest
        ? url.pathname.endsWith('/login')
          ? session
          : user
        : protectedStatus === 401
          ? { mensagem: 'Token invalido' }
          : [{ ...user, telefone: '3432221234' }];
      try {
        await send('Fetch.fulfillRequest', {
          requestId,
          responseCode: code,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
            { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
            {
              name: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            },
          ],
          body: Buffer.from(code === 204 ? '' : JSON.stringify(body)).toString('base64'),
        });
      } catch (e) {
        errors.push(String(e));
      }
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:8080/*' }] });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await pause(100);
    }
    throw new Error('Page state not reached: ' + expression);
  };
  const fill = async (values) => {
    await evaluate(
      `(() => { const values=${JSON.stringify(values)}; for(const [id,value] of Object.entries(values)){const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('blur',{bubbles:true}));} })()`,
    );
  };
  const login = async () => {
    await fill({ 'login-email': 'teste@example.com', 'login-senha': 'SenhaSegura!2026' });
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await waitFor(`Boolean(document.querySelector('.patient-identity'))`);
  };
  const screenshot = async (name) => {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  const results = [];
  for (const width of [375, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const route of ['/login', '/cadastro']) {
      await send('Page.navigate', { url: origin + route });
      await waitFor(`Boolean(document.querySelector('form'))`);
      await evaluate('document.fonts.ready.then(()=>true)');
      await evaluate(`document.querySelector('button[type="submit"]').click()`);
      assert(await evaluate(`Boolean(document.querySelector('[aria-invalid="true"]'))`));
      assert.equal(await evaluate(`Boolean(document.querySelector('app-sidebar'))`), false);
      const state = await evaluate(
        `(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('input,button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth+1);}).map(el=>el.id||el.textContent.trim())}))()`,
      );
      assert(state.scrollWidth <= width, JSON.stringify(state));
      assert.equal(state.clipped.length, 0, JSON.stringify(state));
      await screenshot(width + '-' + route.slice(1));
      results.push({ route, ...state });
    }
    await fill({
      'cadastro-nome': 'Pessoa de Teste',
      'cadastro-email': 'teste@example.com',
      'cadastro-senha': 'SenhaSegura!2026',
      'cadastro-confirmacao': 'SenhaSegura!2026',
    });
    await evaluate(`document.querySelector('button[type="submit"]').click()`);
    await waitFor(`location.pathname==='/login' && Boolean(document.querySelector('.success'))`);
    await send('Page.navigate', { url: origin + '/pacientes' });
    await waitFor(
      `location.pathname==='/login' && Boolean(document.querySelector('#login-email'))`,
    );
    await login();
    assert.equal(
      await evaluate(`Object.keys(localStorage).length+Object.keys(sessionStorage).length`),
      0,
    );
    if (width < 1024) await evaluate(`document.querySelector('.menu-toggle').click()`);
    await evaluate(`document.querySelector('.logout-button').click()`);
    await waitFor(
      `location.pathname==='/login' && Boolean(document.querySelector('#login-email'))`,
    );
    await send('Page.navigate', { url: origin + '/pacientes' });
    await waitFor(`Boolean(document.querySelector('#login-email'))`);
    await login();
    await send('Page.reload');
    await waitFor(
      `location.pathname==='/login' && Boolean(document.querySelector('#login-email'))`,
    );
    await login();
    protectedStatus = 401;
    await evaluate(`document.querySelector('.search-submit').click()`);
    await waitFor(`location.pathname==='/login' && Boolean(document.querySelector('.notice'))`);
    protectedStatus = 200;
    results.push({
      width,
      flow: 'registration, login, protected request, logout, reload and 401 expiration',
      passed: true,
    });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      { passed: results.length, widths: [375, 768, 1440], consoleErrors: errors, output },
      null,
      2,
    ),
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    ws?.close();
    browser?.kill();
    server.close();
  });
