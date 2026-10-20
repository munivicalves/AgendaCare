// Real integration check: no mocks, no Fetch interception, no clock manipulation.
// Uses the existing PostgreSQL configuration and retains exactly one fictional user.
// Never prints passwords, JWT_SECRET, tokens, patient rows, or request/response bodies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '../..');
const backend = path.join(workspace, 'backend');
const root = path.join(workspace, 'frontend/dist/frontend/browser');
const output = path.join(workspace, '.validation');
fs.mkdirSync(output, { recursive: true });
const email = 'qa.auth.' + crypto.randomUUID() + '@example.invalid';
const password = 'Aa1!' + crypto.randomBytes(24).toString('base64url');
const env = {
  ...process.env,
  JWT_SECRET: crypto.randomBytes(32).toString('base64'),
  JWT_TTL: '1m',
  QA_AUTH_EMAIL: email,
};
const browserPath =
  process.env.QA_CHROME ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find((p) => fs.existsSync(p));
assert(browserPath, 'An installed Chromium browser is required.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'agendacare-real-auth-'));
const jar = path.join(backend, 'target/agendacare-0.0.1-SNAPSHOT.jar');
const driverRoot = path.join(os.homedir(), '.m2/repository/org/postgresql/postgresql');
const driverVersion = fs
  .readdirSync(driverRoot)
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  .find((v) => fs.existsSync(path.join(driverRoot, v, 'postgresql-' + v + '.jar')));
const driver = path.join(driverRoot, driverVersion, 'postgresql-' + driverVersion + '.jar');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let javaProcess, browser, ws, apiToken, server;
const checks = [];
const traffic = [];
const runtimeErrors = [];
function passed(check) {
  checks.push({ check, passed: true });
}
function databaseAudit(mode) {
  const result = spawnSync('java', ['-cp', driver, 'tools/RealDatabaseAudit.java', mode], {
    cwd: backend,
    env,
    windowsHide: true,
    encoding: 'utf8',
  });
  // Restrict output to our known, credential-free success markers.
  if (result.status !== 0)
    throw new Error('Read-only PostgreSQL audit failed (' + mode + '); details suppressed.');
  assert(
    result.stdout.includes(
      mode === 'before'
        ? 'READ_ONLY_BASELINE_OK'
        : 'EXISTING_ROWS_UNCHANGED_AND_FICTIONAL_USER_PERSISTED',
    ),
    'Database audit did not confirm the expected state.',
  );
  passed(
    mode === 'before'
      ? 'PostgreSQL read-only baseline'
      : 'PostgreSQL persistence, BCrypt and unchanged existing rows',
  );
}
async function api(endpoint, body, token) {
  const response = await fetch('http://localhost:8080/api' + endpoint, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
  });
  return response;
}
async function assertFreePort(port) {
  const probe = http.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', () =>
      reject(new Error('Required port ' + port + ' is already in use; no process was stopped.')),
    );
    probe.listen(port, () => probe.close(resolve));
  });
}

(async () => {
  await assertFreePort(8080);
  await assertFreePort(4200);
  databaseAudit('before');
  const log = fs.openSync(path.join(output, 'backend-real.log'), 'w');
  javaProcess = spawn(
    'java',
    [
      '-jar',
      jar,
      '--server.port=8080',
      '--spring.jpa.show-sql=false',
      '--logging.level.root=INFO',
      '--logging.level.org.springframework.web=INFO',
      '--logging.level.org.hibernate.SQL=WARN',
      '--logging.level.org.hibernate.orm.jdbc.bind=OFF',
    ],
    { cwd: backend, env, windowsHide: true, stdio: ['ignore', log, log] },
  );
  fs.closeSync(log);
  let ready = false;
  for (let i = 0; i < 160; i++) {
    if (javaProcess.exitCode !== null)
      throw new Error('Spring Boot stopped during startup; inspect the private local startup log.');
    try {
      if ((await api('/pacientes')).status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await pause(250);
  }
  assert(ready, 'Spring Boot did not become ready.');
  passed('Spring Boot startup with a random external JWT_SECRET and real PostgreSQL');
  for (const endpoint of ['/pacientes', '/agendamentos', '/dashboard']) {
    assert.equal(
      (await api(endpoint)).status,
      401,
      'An unauthenticated API request was not blocked.',
    );
  }
  passed('Unauthenticated API access blocked');

  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:4200');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    const target =
      fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
    const mime =
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
      }[path.extname(target)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise((resolve) => server.listen(4200, resolve));
  browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      '--user-data-dir=' + profile,
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
  assert(port, 'Browser debugging unavailable.');
  const target = await (
    await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })
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
        reject(new Error('Browser command timed out: ' + method));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        pending.delete(msg.id);
        msg.error ? p.reject(new Error('Browser command failed')) : p.resolve(msg.result);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') runtimeErrors.push('Unhandled browser exception');
    if (msg.method === 'Network.requestWillBeSent') {
      const request = msg.params.request;
      const url = new URL(request.url);
      if (url.origin === 'http://localhost:8080') {
        const authorization = Object.entries(request.headers).find(
          ([name]) => name.toLowerCase() === 'authorization',
        )?.[1];
        traffic.push({
          id: msg.params.requestId,
          path: url.pathname,
          method: request.method,
          bearer: typeof authorization === 'string' && authorization.startsWith('Bearer '),
        });
      }
    }
    if (msg.method === 'Network.responseReceived') {
      const entry = traffic.findLast((item) => item.id === msg.params.requestId);
      if (entry) entry.status = msg.params.response.status;
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error('Browser evaluation failed; details suppressed.');
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression)) return;
      await pause(200);
    }
    throw new Error('Expected browser state was not reached; details suppressed.');
  };
  const fill = async (values) => {
    await evaluate(
      '(()=>{const values=' +
        JSON.stringify(values) +
        ';for(const [id,value] of Object.entries(values)){const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("blur",{bubbles:true}));}})()',
    );
  };
  const submit = () => evaluate('document.querySelector("button[type=submit]").click()');
  const navigate = (route) => send('Page.navigate', { url: 'http://localhost:4200' + route });
  await navigate('/agenda');
  await waitFor('location.pathname==="/login" && Boolean(document.querySelector("#login-email"))');
  assert(!(await evaluate('Boolean(document.querySelector("app-sidebar"))')));
  passed('Angular protected route redirects to Login');
  await navigate('/cadastro');
  await waitFor('Boolean(document.querySelector("#cadastro-nome"))');
  const registration = {
    'cadastro-nome': 'Usuario Ficticio Validacao',
    'cadastro-email': email,
    'cadastro-senha': password,
    'cadastro-confirmacao': password,
  };
  await fill(registration);
  await submit();
  await waitFor('location.pathname==="/login" && Boolean(document.querySelector(".success"))');
  assert(traffic.some((item) => item.path === '/api/auth/register' && item.status === 201));
  passed('Angular registration returns 201 against the real backend');
  databaseAudit('after');

  await navigate('/cadastro');
  await waitFor('Boolean(document.querySelector("#cadastro-nome"))');
  await fill(registration);
  await submit();
  await waitFor('Boolean(document.querySelector("[role=alert]"))');
  assert(traffic.some((item) => item.path === '/api/auth/register' && item.status === 409));
  assert(
    await evaluate('document.querySelector("[role=alert]").textContent.includes("cadastrado")'),
  );
  passed('Duplicate email returns 409 and a friendly Angular message');
  await navigate('/login');
  await waitFor('Boolean(document.querySelector("#login-email"))');
  await fill({ 'login-email': email, 'login-senha': password + 'wrong' });
  await submit();
  await waitFor('Boolean(document.querySelector("[role=alert]"))');
  assert(traffic.some((item) => item.path === '/api/auth/login' && item.status === 401));
  passed('Invalid real credentials return 401 and a friendly Angular message');

  const response = await api('/auth/login', { email, senha: password });
  assert.equal(response.status, 200);
  const loginBody = await response.json();
  assert(
    loginBody.tokenType === 'Bearer' && loginBody.expiresIn === 60,
    'Test runtime must use a real one-minute token.',
  );
  assert(!JSON.stringify(loginBody).includes(password), 'The response must not echo the password.');
  apiToken = loginBody.accessToken;
  passed('Real login issues a signed token with configured one-minute expiration');
  const login = async () => {
    await fill({ 'login-email': email, 'login-senha': password });
    await submit();
    await waitFor('Boolean(document.querySelector("app-sidebar")) && location.pathname!=="/login"');
  };
  await login();
  for (const [route, selector] of [
    ['/', '.dashboard'],
    ['/pacientes', '.patients-panel'],
    ['/agenda', '.month-grid'],
  ]) {
    await evaluate(
      'document.querySelector(' + JSON.stringify('nav a[href="' + route + '"]') + ').click()',
    );
    await waitFor(
      'location.pathname===' +
        JSON.stringify(route) +
        ' && Boolean(document.querySelector(' +
        JSON.stringify(selector) +
        '))',
    );
    await waitFor('!document.querySelector("main").textContent.includes("Carregando")');
    assert(
      !(await evaluate('Boolean(document.querySelector("main [role=alert]"))')),
      'A protected page displayed an error.',
    );
    passed('Authenticated Angular page ' + (route === '/' ? 'Dashboard' : route));
  }
  for (const endpoint of ['/api/pacientes', '/api/agendamentos']) {
    assert(
      traffic.some((item) => item.path === endpoint && item.status === 200 && item.bearer),
      'Authenticated Angular API request was not observed.',
    );
  }
  assert(
    traffic.filter((item) => item.path.startsWith('/api/auth/')).every((item) => !item.bearer),
    'Credentials were attached to a public auth endpoint.',
  );
  passed('Angular sends Bearer only on protected real API requests');
  await evaluate('document.querySelector(".logout-button").click()');
  await waitFor('location.pathname==="/login" && Boolean(document.querySelector("#login-email"))');
  await evaluate('history.back()');
  await waitFor('location.pathname==="/login" && Boolean(document.querySelector("#login-email"))');
  passed('Logout clears the session and browser back cannot reveal the protected layout');
  await navigate('/pacientes');
  await waitFor('Boolean(document.querySelector("#login-email"))');
  await login();
  await send('Page.reload');
  await waitFor('location.pathname==="/login" && Boolean(document.querySelector("#login-email"))');
  assert(
    await evaluate(
      'Object.keys(localStorage).length===0 && Object.keys(sessionStorage).length===0',
    ),
  );
  passed('Reload requires a new login and no credentials are persisted in Web Storage');
  await login();
  console.log(
    'Real integration flows passed; waiting for actual JWT/session expiration (no fake clock).',
  );
  await waitFor(
    'location.pathname==="/login" && Boolean(document.querySelector(".notice"))',
    90000,
  );
  assert.equal((await api('/pacientes', null, apiToken)).status, 401);
  passed('Actual expiration redirects Angular and PostgreSQL-backed API rejects expired JWT');
  databaseAudit('after');
  assert.equal(runtimeErrors.length, 0, 'Unhandled browser exception during real integration.');
  passed('No unhandled browser exceptions');
  const report = {
    passed: checks.length,
    backend: 'Spring Boot with PostgreSQL (no mocks)',
    ttlForThisRunSeconds: 60,
    fictionalUserEmail: email,
    existingDataUnchanged: true,
    checks,
    requests: traffic.map(({ path, method, status, bearer }) => ({ path, method, status, bearer })),
    note: 'One fictional user retained. No patient or appointment records were written or deleted.',
  };
  fs.writeFileSync(path.join(output, 'real-auth-results.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: checks.length,
        existingDataUnchanged: true,
        fictionalUsersRetained: 1,
        secretsPrinted: false,
      },
      null,
      2,
    ),
  );
})()
  .catch((error) => {
    // Generic assertion messages only; do not print HTTP payloads or browser evaluations.
    fs.writeFileSync(
      path.join(output, 'real-auth-partial.json'),
      JSON.stringify(
        { passed: checks.length, checks, fictionalUserEmail: email, error: error.message },
        null,
        2,
      ),
    );
    console.error('REAL_AUTH_VALIDATION_FAILED: ' + error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    ws?.close();
    browser?.kill();
    javaProcess?.kill();
    server?.close();
  });
