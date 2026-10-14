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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-voice-"));
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
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/voice-comments.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
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
  browser = spawn(chromeBinary, ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${path.join(temp, "profile")}`, "about:blank"], { stdio: "ignore" });
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
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ": " + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await wait(100); } throw new Error(`UI check timed out: ${expression}\n${JSON.stringify(browserErrors)}\n${await evaluate('JSON.stringify(document.body.innerText)')}`); };
  const check = async (expression, name) => { if (!await evaluate(expression)) throw new Error(`${name}\n${await evaluate('document.body.textContent.slice(0, 2400)')}`); console.log(`PASS ${name}`); };
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: origin });
  const clickText = async text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(${JSON.stringify(text)})).click()`);
  await until('document.body.textContent.includes("Comments")');
  await clickText('Comments');
  await until(`!!document.querySelector('button[aria-label="Record voice"]')`);
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check(`(() => { const mic = document.querySelector('button[aria-label="Record voice"]').getBoundingClientRect(); const clip = document.querySelector('button[aria-label="Attach a file"]').getBoundingClientRect(); return mic.x < clip.x && Math.abs(mic.y - clip.y) < 2 && !document.querySelector('button[aria-label="Record voice"]').textContent; })()`, 'microphone is icon-only immediately left of attachment control');

  await until('Array.from(document.querySelectorAll("button")).some(b => b.getAttribute("aria-label") === "Record voice" && !b.disabled)');
  await evaluate(`document.querySelector('button[aria-label="Record voice"]').click()`);
  await until('document.body.textContent.includes("0:00 / 3:00")');
  await check('Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "Send comment").disabled && window.voiceChecks.uploads.length === 0', 'recording does not upload or allow sending incomplete audio');
  await wait(1400);
  await fs.writeFile('/tmp/voice-recording-mobile.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));
  await check('document.documentElement.scrollWidth <= window.innerWidth && !!document.querySelector("[data-audio-waveform]")', 'live waveform fits the mobile recording toolbar');
  await evaluate(`document.querySelector('button[aria-label="Stop recording"]').click()`);
  await until('!!document.querySelector("audio")');
  await check('window.voiceChecks.streams.every(s => s.getTracks().every(t => t.readyState === "ended"))', 'stopping releases the microphone');
  await evaluate(`document.querySelector('button[aria-label="Play voice message"]').click()`);
  await until('document.querySelector("audio").currentTime > 0');
  await check('window.voiceChecks.uploads.length === 0 && !!document.querySelector("[data-audio-waveform]")', 'custom waveform player plays locally before sending');
  await evaluate(`document.querySelector('button[aria-label="Pause voice message"]').click()`);
  await check('document.querySelector("audio").paused', 'pause control stops playback');
  await until(`Number(document.querySelector('input[aria-label="Seek voice message"]').max) > 1`);
  await evaluate(`(() => { const slider = document.querySelector('input[aria-label="Seek voice message"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, Number(slider.max) / 2); slider.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await check(`Math.abs(document.querySelector('audio').currentTime - Number(document.querySelector('input[aria-label="Seek voice message"]').max) / 2) < 0.1`, 'waveform supports seeking');
  await fs.writeFile('/tmp/voice-playback-mobile.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));

  await evaluate('window.voiceChecks.uploadFail = true');
  await clickText('Send');
  await until('!Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "Send comment").disabled');
  await check('!!document.querySelector("audio") && window.voiceChecks.posts.length === 0', 'upload failure retains the recording for retry');
  await evaluate('window.voiceChecks.uploadFail = false');
  await clickText('Send');
  await until('window.voiceChecks.posts.length === 1 && document.body.textContent.includes("Comments (1)")');
  await check('window.voiceChecks.uploads[0].size > 0 && window.voiceChecks.posts[0].attachment.storagePath.startsWith("task-activity-comments/") && !JSON.stringify(window.voiceChecks.posts[0]).includes("base64")', 'send uploads audio separately and posts only file reference metadata');
  await until('Array.from(document.querySelectorAll("button")).some(b => b.getAttribute("aria-label") === "Record voice" && !b.disabled)');
  await evaluate(`document.querySelector('button[aria-label="Record voice"]').click()`);
  await until('document.body.textContent.includes("0:00 / 3:00")');
  await evaluate(`document.querySelector('button[aria-label="Discard recording"]').click()`);
  await until(`!!document.querySelector('button[aria-label="Record voice"]')`);
  await check('window.voiceChecks.streams.every(s => s.getTracks().every(t => t.readyState === "ended")) && window.voiceChecks.uploads.length === 1', 'discard stops recording without an upload');
  await evaluate(`document.querySelector('button[aria-label="Record voice"]').click()`);
  await until('document.body.textContent.includes("0:00 / 3:00")');
  await wait(1100);
  await evaluate('window.originalNow = Date.now; Date.now = () => window.originalNow() + 181000');
  await until(`!!document.querySelector('button[aria-label="Remove voice message"]')`);
  await evaluate('Date.now = window.originalNow');
  await check('window.voiceChecks.streams.every(s => s.getTracks().every(t => t.readyState === "ended")) && window.voiceChecks.uploads.length === 1', 'three minute limit stops recording into a draft without uploading');
  await evaluate(`document.querySelector('button[aria-label="Remove voice message"]').click()`);
  await evaluate('window.voiceChecks.deny = true');
  await until('Array.from(document.querySelectorAll("button")).some(b => b.getAttribute("aria-label") === "Record voice" && !b.disabled)');
  await evaluate(`document.querySelector('button[aria-label="Record voice"]').click()`);
  await until('document.body.textContent.includes("Microphone access was denied")');
  await check('!Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "Record voice").disabled', 'permission denial restores usable recording controls');
  await evaluate('window.voiceChecks.deny = false; window.voiceChecks.delay = true');
  await until('Array.from(document.querySelectorAll("button")).some(b => b.getAttribute("aria-label") === "Record voice" && !b.disabled)');
  await evaluate(`document.querySelector('button[aria-label="Record voice"]').click()`);
  await until('!!window.voiceChecks.releasePermission');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('document.querySelectorAll("[role=dialog]").length === 0');
  await evaluate('window.voiceChecks.releasePermission()');
  await until('window.voiceChecks.streams.every(s => s.getTracks().every(t => t.readyState === "ended"))');
  console.log('PASS closing the sheet releases even a late microphone permission request');
  if (browserErrors.length) throw new Error(browserErrors.join("\n"));
} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, "exit"); browser.kill("SIGTERM"); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
