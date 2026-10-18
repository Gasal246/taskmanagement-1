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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-target-ui-"));
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
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/enquiry-targets.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
    plugins: [new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "production", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "isolated-fixture" }) })],
    resolve: { alias: { "@": root }, extensions: [".tsx", ".ts", ".js"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssDirectory = path.join(root, process.env.UI_TEST_BUILD_DIR || ".next", "static/css");
  const cssFiles = (await fs.readdir(cssDirectory)).filter(file => file.endsWith(".css"));
  if (!cssFiles.length) throw new Error("Build CSS is missing; set UI_TEST_BUILD_DIR to a completed production build");
  const css = (await Promise.all(cssFiles.map(file => fs.readFile(path.join(cssDirectory, file), "utf8")))).join("\n");
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
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error(`UI check timed out: ${expression}\n${JSON.stringify(browserErrors)}\n${await evaluate('JSON.stringify(window.targetChecks || document.body.innerText)')}`); };
  const check = async (expression, name) => { if (!await evaluate(expression)) throw new Error(`${name}\n${await evaluate('document.body.textContent.slice(0, 2400)')}`); console.log(`PASS ${name}`); };
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: origin });
  await until('document.querySelectorAll("article").length === 2');
  const click = async text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
  const aria = async name => evaluate(`document.querySelector('button[aria-label="' + ${JSON.stringify(name)} + '"]').click()`);
  const select = async (label, value) => evaluate(`(() => { const node = Array.from(document.querySelectorAll('[role=dialog] label')).find(l => l.textContent.startsWith(${JSON.stringify(label)})).querySelector('select'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const fill = async (selector, value) => evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(n.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(n, ${JSON.stringify(value)}); n.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const closeCheck = () => until('!document.querySelector("[role=dialog]")');
  const submit = async () => { await click('Save'); await until('document.body.textContent.includes("Save despite overlaps")'); await click('Save despite overlaps'); await closeCheck(); };
  await check('document.querySelectorAll("[data-target-id]").length === 1 && document.body.textContent.includes("Contact reception") && document.body.textContent.includes("Target Members")', 'group contains enquiry cards, notes and members');
  await click('Add target');
  await until('document.querySelector("[role=dialog]")');
  await check('document.querySelectorAll("[role=dialog] label").length === 2 && !document.querySelector("[role=dialog]").textContent.includes("Country")', 'add target dialog contains only the period');
  await select('Week', '1'); await click('Save'); await closeCheck();
  await until('document.querySelectorAll("[data-target-id]").length === 2');
  await check('window.targetChecks.targets[1].enquiry_ids.length === 0 && window.targetChecks.targets[1].assigned_user_ids.length === 0 && document.querySelectorAll("[data-target-id] > header h2")[0].textContent === document.querySelectorAll("[data-target-id] > header h2")[1].textContent', 'duplicate period targets remain separate and empty targets are visible');
  await click('Enquiry');
  await until('document.querySelector("[role=dialog]")?.textContent.includes("Add enquiries")');
  await select('Country', '222222222222222222222222'); await select('Region', '333333333333333333333333');
  await until('document.querySelectorAll("[role=dialog] input[type=checkbox]").length === 2');
  await check('Array.from(document.querySelectorAll("[role=dialog] input[type=checkbox]")).every(c => c.disabled)', 'already-added enquiries cannot be duplicated');
  await click('Next'); await until('document.querySelectorAll("[role=dialog] input[type=checkbox]").length === 1');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await click('Previous'); await until('document.querySelectorAll("[role=dialog] input[type=checkbox]").length === 2');
  await check('document.querySelector("[role=dialog]").textContent.includes("ENQ-3")', 'selection survives paging');
  await fill('input[aria-label="Search enquiries by number or facility"]', 'Facility 3');
  await until('window.targetChecks.requests.some(r => r.params.search === "Facility 3")');
  await check('document.querySelector("[role=dialog] input[type=checkbox]").checked', 'selection survives search');
  await fill('[role=dialog] textarea', 'Site visit note');
  await click('Save'); await until('document.body.textContent.includes("Save despite overlaps")');
  await check('!window.targetChecks.saved.some(s => s.operation === "add_enquiries")', 'overlap warning appears before changes are saved');
  await click('Save despite overlaps'); await closeCheck();
  await until('document.querySelectorAll("article").length === 3');
  await check('document.body.textContent.includes("Site visit note")', 'added enquiry displays its target note');
  await aria('Edit note: ENQ-1'); await until('document.querySelector("[role=dialog] textarea")');
  await fill('[role=dialog] textarea', 'Updated note'); await click('Save'); await closeCheck();
  await check('document.body.textContent.includes("Updated note") && window.targetChecks.targets[0].enquiry_ids.length === 3', 'note editing does not change enquiry membership');
  await aria('Edit note: ENQ-1'); await until('document.querySelector("[role=dialog] textarea")');
  await fill('[role=dialog] textarea', ''); await click('Save');
  await until('document.body.textContent.includes("Confirm remove note")');
  await check('window.targetChecks.targets[0].enquiry_notes["555555555555555555555551"] === "Updated note"', 'clearing a saved note requires confirmation');
  await click('Cancel'); await closeCheck();
  await click('Member'); await until('document.querySelector("[role=dialog]")?.textContent.includes("Staff Two")');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()'); await submit();
  await check('window.targetChecks.targets[0].assigned_user_ids.length === 2', 'members are added independently');
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-target-v2-desktop.png', Buffer.from(result.data, 'base64')));
  await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(300);
  await check('document.documentElement.scrollWidth <= 375', 'grouped layout fits mobile');
  await evaluate('document.querySelector("[data-target-id]").scrollIntoView()');
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-target-v2-mobile.png', Buffer.from(result.data, 'base64')));
  await aria('Remove enquiry: ENQ-3'); await until('document.querySelector("[role=dialog]")?.textContent.includes("Remove enquiry from target?")');
  await check('window.targetChecks.targets[0].enquiry_ids.length === 3', 'enquiry removal waits for confirmation');
  await click('Cancel'); await closeCheck();
  await aria('Remove enquiry: ENQ-3'); await until('document.querySelector("[role=dialog]")'); await click('Confirm remove enquiry'); await closeCheck();
  await check('window.targetChecks.targets[0].enquiry_ids.length === 2 && document.querySelectorAll("article").length === 2', 'removing an enquiry affects only its target membership');
  await aria('Remove member: Staff Two'); await until('document.querySelector("[role=dialog]")');
  await check('window.targetChecks.targets[0].assigned_user_ids.length === 2', 'member removal waits for confirmation');
  await click('Confirm remove member'); await closeCheck();
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label")?.startsWith("Edit target period:")).click()');
  await until('document.querySelector("[role=dialog]")?.textContent.includes("Edit target period")');
  await select('Week', '2'); await submit();
  await check('window.targetChecks.targets[0].week === 2 && window.targetChecks.targets[0].enquiry_ids.length === 2', 'period editing preserves enquiries');
  await click('Staff mode'); await until('document.querySelector("h1")?.textContent === "My Targets"');
  await check('document.querySelectorAll("[data-target-id]").length === 1 && document.body.textContent.includes("Updated note") && !Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label")?.startsWith("Remove enquiry:")) && !document.body.textContent.includes("Assigned person") && !Array.from(document.querySelectorAll("button")).some(b => ["Add target", "Enquiry", "Member"].includes(b.textContent.trim()))', 'staff sees assigned groups and notes without management controls');
  await click('Admin mode'); await until('document.querySelectorAll("[data-target-id]").length === 2');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label")?.startsWith("Delete target:")).click()'); await until('document.querySelector("[role=dialog]")');
  await check('window.targetChecks.targets.length === 2', 'target deletion waits for confirmation');
  await click('Confirm delete target'); await closeCheck();
  await until('document.querySelectorAll("[data-target-id]").length === 1');
  await click('Staff mode'); await until('document.body.textContent.includes("No targets assigned")');
  await click('Fail'); await until('document.querySelector("[role=alert]")?.textContent.includes("Test connection unavailable")');
  await click('Recover'); await until('!document.querySelector("[role=alert]")');
  await check('window.targetChecks.errors.length === 0', 'empty and recoverable error states render without browser errors');
  if (browserErrors.length) throw new Error(browserErrors.join("\n"));

} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, "exit"); browser.kill("SIGTERM"); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
