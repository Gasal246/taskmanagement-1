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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-activity-view-"));
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
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/activity-details.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
    plugins: [new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "production", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "isolated-fixture" }) })],
    resolve: { alias: { "@": root }, extensions: [".tsx", ".ts", ".js"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', path.join(root, 'app/globals.css'), '-o', path.join(temp, 'style.css')], { cwd: root, stdio: 'pipe' });
  const css = await fs.readFile(path.join(temp, 'style.css'), 'utf8');
  server = http.createServer(async (req, res) => {
    if (req.url?.startsWith("/api/task/activity-files?")) { res.setHeader("Content-Type", "image/png"); res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64")); }
    else if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript; charset=utf-8"); res.end(await fs.readFile(path.join(temp, "fixture.js"))); }
    else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
    else if (req.url === "/") res.end('<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{background:#020617;color:#eee;padding:12px}button{border:1px solid #555;padding:6px;margin:4px}main{max-width:900px;margin:auto}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
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
  await until('!!document.getElementById("view-activity")');
  await evaluate('document.getElementById("view-activity").focus(); document.getElementById("view-activity").click()');
  await until('!!document.querySelector("[data-activity-detail-body]")');
  await wait(600);
  await check('document.querySelector("[data-activity-detail-body]").textContent.includes("Sam Taylor") && document.querySelector("[data-activity-detail-body]").textContent.includes("Alex Morgan")', 'assignment actor and activity people are shown');
  await check('document.querySelectorAll("[role=dialog] input, [role=dialog] textarea").length === 0 && !document.querySelector("[role=dialog]").textContent.includes("Attach files")', 'view is read-only, including attachments');
  await check('document.querySelector("[data-activity-detail-body] a")?.getAttribute("href").includes("/api/task/activity-files?")', 'attachment downloads use the authorized file endpoint');
  await evaluate(`document.querySelector('button[aria-label="Preview Installation photo.png"]').click()`);
  await until('document.querySelectorAll("[role=dialog]").length === 2 && Array.from(document.querySelectorAll("[role=dialog] img")).some(image => image.alt === "Installation photo.png" && image.naturalWidth > 0 && getComputedStyle(image).objectFit === "contain")');
  await check('Array.from(document.querySelectorAll("[role=dialog] a")).some(link => link.textContent.includes("Download") && link.href.includes("storagePath=photo") && link.href.includes("download=1"))', 'image preview loads through authenticated route and retains download');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('document.querySelectorAll("[role=dialog]").length === 1');
  await check('document.activeElement?.getAttribute("aria-label") === "Preview Installation photo.png"', 'closing image preview restores its document tile and keeps the activity open');
  const before = await evaluate('document.querySelector("[data-activity-detail-footer]").getBoundingClientRect().top');
  await evaluate('document.querySelector("[data-activity-detail-body]").scrollTop = 10000');
  await check(`Math.abs(document.querySelector("[data-activity-detail-footer]").getBoundingClientRect().top - ${before}) < 2`, 'footer stays fixed while details scroll');
  await evaluate('document.getElementById("complete").click()');
  await until('document.getElementById("complete").textContent === "Reopen activity"');
  await check('document.querySelector("[role=dialog]").textContent.includes("Completed")', 'view reflects updated activity status immediately');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "History").click()');
  await until('document.querySelectorAll("[role=dialog]").length === 2');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('document.querySelectorAll("[role=dialog]").length === 1');
  await check('!!document.querySelector("[data-activity-detail-footer]")', 'closing a secondary action returns to the activity view');
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(300);
  await check('document.querySelector("[role=dialog]").getBoundingClientRect().width <= 375 && document.querySelector("[data-activity-detail-body]").clientWidth === document.querySelector("[data-activity-detail-body]").scrollWidth', 'mobile view has no horizontal overflow');
  await check('document.querySelector("[data-activity-detail-footer]").getBoundingClientRect().bottom <= 813 && document.querySelector("[data-activity-detail-body]").clientHeight > 150', 'mobile footer remains visible with usable scrolling space');
  await evaluate('document.querySelector("[data-activity-detail-body]").scrollTop = 0');
  await wait(500);
  const screenshot = await command('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('/tmp/taskmanager-activity-view-mobile.png', Buffer.from(screenshot.data, 'base64'));
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('document.querySelectorAll("[role=dialog]").length === 0');
  await check('document.activeElement?.id === "view-activity"', 'keyboard dismissal restores focus to the activity');
  if (browserErrors.length) throw new Error(browserErrors.join("\n"));
} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, "exit"); browser.kill("SIGTERM"); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
