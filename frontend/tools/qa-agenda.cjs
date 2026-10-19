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
const output = path.resolve(__dirname, '../.qa-agenda');
fs.mkdirSync(output, { recursive: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const patient = { id: 7, nome: 'Paciente de Teste com Nome Completo para Revisao Responsiva' };
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const appointments = ['AGENDADO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'FALTOU'].map(
  (status, index) => ({
    id: index + 1,
    pacienteId: 7,
    pacienteNome: patient.nome,
    data: today,
    horaInicio: '00:00:00',
    horaFim: '00:01:00',
    tipo: 'Consulta de acompanhamento com descricao longa',
    status,
    observacoes: 'Observacoes de teste para verificar a quebra de texto nas telas menores.',
    createdAt: today,
  }),
);
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
      const body = url.pathname.includes('/pacientes')
        ? [patient]
        : /\/agendamentos\/\d+$/.test(url.pathname)
          ? appointments[1]
          : appointments;
      try {
        await send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: origin },
          ],
          body: Buffer.from(JSON.stringify(body)).toString('base64'),
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
  const results = [];
  for (const width of [375, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const view of ['monthly', 'weekly', 'new', 'edit']) {
      const route =
        view === 'new' ? '/agenda/novo' : view === 'edit' ? '/agenda/2/editar' : '/agenda';
      await send('Page.navigate', { url: origin + route });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (
          await evaluate(
            `Boolean(document.querySelector('${view === 'new' || view === 'edit' ? '#pacienteId option[value]' : '.appointment-actions'}')) && !document.querySelector('button[type="submit"]:disabled')`,
          )
        ) {
          ready = true;
          break;
        }
        await pause(100);
      }
      assert(ready, 'Page not ready: ' + route);
      await evaluate('document.fonts.ready.then(()=>true)');
      if (view === 'weekly') {
        await evaluate(
          `[...document.querySelectorAll('main button')].find(el=>el.textContent.trim()==='Semanal').click()`,
        );
        assert(await evaluate(`Boolean(document.querySelector('.week-grid'))`));
      }
      assert.equal(await evaluate(`Boolean(document.querySelector('.header-action'))`), false);
      if (view === 'monthly' || view === 'weekly') {
        assert.equal(
          await evaluate(`document.querySelectorAll('a[href="/agenda/novo"]').length`),
          1,
        );
      }
      if (view === 'new') {
        await evaluate(`document.querySelector('button[type="submit"]').click()`);
        assert.equal(
          await evaluate(`document.querySelector('#pacienteId').getAttribute('aria-invalid')`),
          'true',
        );
      }
      const state = await evaluate(`(() => {
        const controls=[...document.querySelectorAll('main input,main select,main textarea,main button,main a')];
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
          clipped:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth+1);}).map(el=>el.id||el.textContent.trim())};
      })()`);
      assert(state.scrollWidth <= width, JSON.stringify({ view, ...state }));
      assert.equal(state.clipped.length, 0, JSON.stringify({ view, ...state }));
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      });
      fs.writeFileSync(path.join(output, `${width}-${view}.png`), Buffer.from(shot.data, 'base64'));
      results.push({ view, route, ...state });
    }
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
