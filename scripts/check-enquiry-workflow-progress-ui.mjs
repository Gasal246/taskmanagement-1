// Isolated browser fixture: no application server, credentials or database.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-workflow-ui-"));
const chromeBinary = process.env.CHROME_BINARY || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, socket, server;
try {
  const loader = path.join(temp, "typescript-loader.cjs");
  await fs.writeFile(loader, `const ts = require(${JSON.stringify(require.resolve("typescript"))}); module.exports = source => ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;`);
  const compiledWebpack = require("next/dist/compiled/webpack/webpack");
  compiledWebpack.init();
  const webpack = compiledWebpack.webpack;
  await new Promise((resolve, reject) => webpack({
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/enquiry-workflow-progress.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
    plugins: [new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "production", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "isolated-fixture" }) })],
    resolve: { alias: { "@": root }, extensions: [".tsx", ".ts", ".js"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssDirectory = path.join(root, process.env.UI_TEST_BUILD_DIR || ".next", "static/css");
  const cssFiles = (process.env.UI_TEST_CSS ? [] : await fs.readdir(cssDirectory)).filter(file => file.endsWith(".css"));
  if (!cssFiles.length && !process.env.UI_TEST_CSS) throw new Error("Build CSS is missing; set UI_TEST_BUILD_DIR to a completed production build");
  const css = process.env.UI_TEST_CSS ? await fs.readFile(process.env.UI_TEST_CSS, "utf8") : (await Promise.all(cssFiles.map(file => fs.readFile(path.join(cssDirectory, file), "utf8")))).join("\n");
  server = http.createServer(async (req, res) => {
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript; charset=utf-8"); res.end(await fs.readFile(path.join(temp, "fixture.js"))); }
    else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
    else if (req.url === "/") res.end('<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{background:#020617;color:#eee;margin:0}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(chromeBinary, ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${path.join(temp, "profile")}`, "about:blank"], { stdio: "ignore" });
  let spawnError;
  browser.on("error", error => { spawnError = error; });
  let port;
  for (let i = 0; i < 100; i++) {
    if (spawnError) throw spawnError;
    try { port = (await fs.readFile(path.join(temp, "profile/DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await wait(100); }
  }
  if (!port) throw new Error("Chrome did not start; set CHROME_BINARY to a local Chromium executable");
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await once(socket, "open");
  let messageId = 0;
  const pending = new Map();
  const browserErrors = [];
  socket.addEventListener("message", event => { const message = JSON.parse(event.data); if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timeout: ${method}`)); }, 10_000);
    pending.set(id, response => { clearTimeout(timer); response.error ? reject(new Error(response.error.message)) : resolve(response.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ": " + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error(`UI check timed out: ${expression}\n${JSON.stringify(browserErrors)}\n${await evaluate('JSON.stringify(window.progressChecks || document.body.innerText)')}`); };
  const check = async (expression, name) => { if (!await evaluate(expression)) throw new Error(`${name}\n${await evaluate('document.body.textContent.slice(0, 2400)')}`); console.log(`PASS ${name}`); };
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: origin });
  await until('document.querySelectorAll("[aria-current=step]").length === 2');
  const click = async text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
  const aria = async label => evaluate(`document.querySelector('button[aria-label="' + ${JSON.stringify(label)} + '"]').click()`);
  const closed = () => until('!document.querySelector("[role=alertdialog], [role=dialog]")');
  await check('document.querySelector("#card").textContent.includes("5/12 stages completed")', 'card count derives from the current position');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await until(`document.querySelector('#card [tabindex="0"]').scrollLeft > 0`);
  await command('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1000, deviceScaleFactor: 1, mobile: false });
  await check('document.querySelector("#view").textContent.includes("AM") && document.querySelector("#view").textContent.includes("CD")', 'role subnames render in view chips');
  await aria('Assign AM users'); await until('document.querySelector("[role=dialog]")');
  await check('!document.querySelector("[role=dialog]").textContent.includes("Bob") && document.querySelector("[role=dialog]").textContent.includes("Alice")', 'users assigned to another role are excluded from role selection');
  await evaluate('document.querySelector("[role=dialog] button[aria-label=Close]")?.click()');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await closed();
  await click('Mark stage completed'); await until('document.querySelector("[role=alertdialog]")');
  await check('window.progressChecks.writes.length === 0', 'completion requires confirmation'); await click('Confirm'); await closed();
  await until('window.progressChecks.enquiry.workflow_current_stage === 7');
  await click('Staff'); await until('!document.querySelector("#card").textContent.includes("Skip stage")');
  await check('Array.from(document.querySelectorAll("#view button[aria-label^=Reopen]")).length === 0', 'staff cannot reopen a preceding stage belonging to another role');
  await click('Mark stage completed'); await until('document.querySelector("[role=alertdialog]")'); await click('Confirm'); await closed();
  await until('window.progressChecks.enquiry.workflow_current_stage === 8');
  await aria('Reopen Stage 7'); await until('document.querySelector("[role=alertdialog]")');
  await check('document.querySelector("[role=alertdialog]").textContent.includes("all later stages")', 'reopening explains progress reset');
  await click('Confirm'); await closed(); await until('window.progressChecks.enquiry.workflow_current_stage === 7');
  await evaluate('window.progressChecks.fail = true'); await click('Mark stage completed'); await until('document.querySelector("[role=alertdialog]")'); await click('Confirm'); await closed();
  await check('window.progressChecks.enquiry.workflow_current_stage === 7', 'failed completion preserves saved progress');
  await evaluate('window.progressChecks.fail = false'); await click('Admin'); await until('document.querySelector("#card").textContent.includes("Skip stage")');
  await evaluate('document.querySelector("#card button").click()'); await until('document.querySelector("[role=alertdialog]")'); await click('Confirm'); await closed();
  await check('window.progressChecks.writes.at(-1).operation === "skip"', 'admin skip uses a distinct operation');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(500);
  await check('document.documentElement.scrollWidth <= 375', 'timeline and chips fit mobile width');
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-workflow-progress-mobile.png', Buffer.from(result.data, 'base64')));
  await command('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1000, deviceScaleFactor: 1, mobile: false }); await wait(200);
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-workflow-progress-desktop.png', Buffer.from(result.data, 'base64')));
  if (browserErrors.length) throw new Error(browserErrors.join('\n'));
} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, 'exit'); browser.kill('SIGTERM'); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
