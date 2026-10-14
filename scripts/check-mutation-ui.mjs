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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-mutation-ui-"));
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
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/mutation-lifecycle.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
    plugins: [new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "production", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "isolated-fixture" }) })],
    resolve: { alias: { "@": root }, extensions: [".tsx", ".ts", ".js"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', path.join(root, 'app/globals.css'), '-o', path.join(temp, 'style.css')], { cwd: root, stdio: 'pipe' });
  const css = await fs.readFile(path.join(temp, 'style.css'), 'utf8');
  server = http.createServer(async (req, res) => {
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript; charset=utf-8"); res.end(await fs.readFile(path.join(temp, "fixture.js"))); }
    else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
    else if (req.url === "/") res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{background:#020617;color:#eee;padding:12px}button{border:1px solid #555;padding:6px;margin:4px}main{max-width:900px;margin:auto}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
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
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`UI check timed out: ${expression}\n${JSON.stringify(browserErrors)}\n${await evaluate('JSON.stringify(window.listChecks || document.body.innerText)')}`); };
  const check = async (expression, name) => { if (!await evaluate(expression)) throw new Error(`${name}\n${await evaluate('document.body.textContent.slice(0, 2400)')}`); console.log(`PASS ${name}`); };
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: origin });
  await until('!!document.getElementById("save")');
  await evaluate('document.getElementById("open").click()');
  await until('!!document.getElementById("dialog-other")');
  await evaluate('document.getElementById("save").click(); document.getElementById("save").click()');
  await until('document.querySelector("dialog")?.open');
  await check('window.mutationChecks.writes === 1', 'rapid duplicate submit is blocked');
  await evaluate('document.getElementById("other").click(); document.getElementById("dialog-other").click(); document.getElementById("dialog-other").focus()');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await check('window.mutationChecks.clicks === 0', 'page and portalled dialog actions are blocked');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await check('document.querySelector("dialog").open && document.querySelector("dialog").getAttribute("aria-hidden") !== "true"', 'pending modal stays open and accessible');
  await evaluate('window.finishSave()');
  await until('window.mutationChecks.refresh');
  await check('document.querySelector("dialog").open && document.getElementById("value").textContent === "Before"', 'loader stays visible until refreshed data arrives');
  await evaluate('window.finishRefresh()');
  await until('!document.querySelector("dialog").open && document.getElementById("value").textContent === "After"');
  await evaluate('document.getElementById("dialog-other").click()');
  await check('window.mutationChecks.clicks === 1', 'updated view unlocks after completion');
  await evaluate('window.mutationChecks.fail = true; document.getElementById("save").click()');
  await until('document.querySelector("dialog").open');
  await evaluate('window.finishSave()');
  await until('!document.querySelector("dialog").open');
  await check('window.mutationChecks.errors.includes("Failed save") && document.getElementById("value").textContent === "After"', 'failure unlocks the page and retains existing data');
  await evaluate('document.querySelector("[role=dialog] button:last-child").click()');
  await until('!document.getElementById("dialog-other")');
  await evaluate('document.getElementById("upload").click()');
  await until('document.querySelector("dialog").open');
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await check('document.querySelector("dialog").getBoundingClientRect().width <= 375', 'upload loader fits mobile viewport');
  await evaluate('window.finishUpload()');
  await until('!document.querySelector("dialog").open');
  console.log('PASS manual upload lifecycle unlocks cleanly');
  if (browserErrors.length) throw new Error(browserErrors.join("\n"));
} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, "exit"); browser.kill("SIGTERM"); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
