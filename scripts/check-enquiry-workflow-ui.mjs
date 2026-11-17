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
    mode: "production", optimization: { minimize: false }, entry: path.join(root, "tests/ui/enquiry-workflow.fixture.tsx"), output: { path: temp, filename: "fixture.js" },
    plugins: [new webpack.DefinePlugin({ "process.env": JSON.stringify({ NODE_ENV: "production", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "isolated-fixture" }) })],
    resolve: { alias: { "@": root }, extensions: [".tsx", ".ts", ".js"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssDirectory = path.join(root, process.env.UI_TEST_BUILD_DIR || ".next", "static/css");
  const cssFiles = (await fs.readdir(cssDirectory)).filter(file => file.endsWith(".css"));
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
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error(`UI check timed out: ${expression}\n${JSON.stringify(browserErrors)}\n${await evaluate('JSON.stringify(window.workflowChecks || document.body.innerText)')}`); };
  const check = async (expression, name) => { if (!await evaluate(expression)) throw new Error(`${name}\n${await evaluate('document.body.textContent.slice(0, 2400)')}`); console.log(`PASS ${name}`); };
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: origin });
  await until('document.body.textContent.includes("No stages yet")');
  const click = async text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
  const aria = async name => evaluate(`document.querySelector('button[aria-label="' + ${JSON.stringify(name)} + '"]').click()`);
  const fill = async (selector, value) => evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, ${JSON.stringify(value)}); n.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const closed = () => until('!document.querySelector("[role=dialog], [role=alertdialog]")');
  const switchTab = async text => { await evaluate(`Array.from(document.querySelectorAll('[role=tab]')).find(n => n.textContent === ${JSON.stringify(text)}).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, ctrlKey: false }))`); await until(`document.querySelector('[role=tab][data-state=active]').textContent === ${JSON.stringify(text)}`); };
  await check('document.querySelector("[role=tab][data-state=active]").textContent === "stages"', 'Stages is the default tab');
  await click('Add Stage'); await until('document.querySelector("[role=dialog]")');
  await check('document.querySelector("button[type=submit]").disabled && document.querySelector("[role=dialog]").textContent.includes("Create a role")', 'stage creation guides admins to add roles first');
  await click('Cancel'); await closed();
  await switchTab('roles'); await click('Add Role'); await until('document.querySelector("#role-subname")');
  await fill('#role-subname', ' a m '); await fill('#workflow-name', 'Account Manager');
  await check('document.querySelector("#role-subname").value === "AM"', 'subname normalizes to uppercase without spaces');
  await fill('#role-color', '#fbbf24');
  await check(`document.querySelector('[aria-label="Role color hex code"]').value === "#fbbf24"`, 'color picker updates hex value');
  await click('Save'); await closed(); await until('document.querySelectorAll("article").length === 1');
  await check('getComputedStyle(document.querySelector("article h2")).color === "rgb(251, 191, 36)" && window.workflowChecks.workflow.roles[0].color_code === "#fbbf24"', 'chosen role color is saved and displayed');
  await check('document.querySelector("article").textContent.includes("AM") && document.querySelector("article").textContent.includes("Account Manager")', 'role card displays subname and name');
  await click('Add Role'); await until('document.querySelector("#role-subname")');
  await fill('#role-subname', 'AM'); await fill('#workflow-name', 'Duplicate'); await click('Save');
  await until('document.querySelector("[role=alert]")');
  await check('window.workflowChecks.saved.length === 1', 'duplicate subname is rejected before submitting');
  await click('Cancel'); await closed();
  await switchTab('stages');
  for (const name of ['Review', 'Contact']) {
    await click('Add Stage'); await until('document.querySelector("#stage-role")');
    await fill('#workflow-name', name); await evaluate('document.querySelector("#stage-role").click()'); await until('document.querySelector("[role=option]")');
    await check('document.querySelector("[role=option]").textContent === "AM - Account Manager"', 'stage dialog uses the formatted role Select');
    await evaluate('document.querySelector("[role=option]").click()'); await click('Save'); await closed();
  }
  await check('Array.from(document.querySelectorAll("article p")).every(n => getComputedStyle(n).color === "rgb(251, 191, 36)")', 'stage role labels use the saved color');
  await check('Array.from(document.querySelectorAll("article h2")).map(n => n.textContent).join() === "Review,Contact"', 'stages append in order');
  await check(`document.querySelector('button[aria-label="Move Review up"]').disabled && document.querySelector('button[aria-label="Move Contact down"]').disabled`, 'boundary arrows are disabled');
  await aria('Move Contact up'); await until('window.workflowChecks.workflow.stages[0].name === "Contact"');
  await until('document.querySelector("article h2").textContent === "Contact"');
  await check('window.workflowChecks.saved.at(-1).operation === "reorder"', 'arrow buttons persist the new order');
  // Exercise the actual drag handle through pointer input.
  const point = await evaluate('(() => { const r = document.querySelector("button[aria-label^=Drag]").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  for (let offset = 10; offset <= 120; offset += 10) { await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y + offset, button: 'left', buttons: 1 }); await wait(30); }
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y + 120, button: 'left', clickCount: 1 });
  await until('window.workflowChecks.workflow.stages[0].name === "Review"');
  await check('window.workflowChecks.saved.at(-1).operation === "reorder"', 'drag handle persists stage ordering');
  await aria('Edit stage Review'); await until('document.querySelector("#workflow-name")');
  await fill('#workflow-name', 'Qualification'); await click('Save'); await closed();
  await until('document.body.textContent.includes("Qualification")');
  await switchTab('roles'); await aria('Edit role AM'); await until('document.querySelector("#role-subname")');
  await check('document.querySelector("#role-color").value === "#fbbf24"', 'edit form restores saved color');
  await fill('[aria-label="Role color hex code"]', 'invalid'); await click('Save');
  await check('!!document.querySelector("[role=alert]") && window.workflowChecks.workflow.roles[0].color_code === "#fbbf24"', 'invalid hex color cannot be saved');
  await fill('[aria-label="Role color hex code"]', '#a78bfa');
  await fill('#role-subname', 'CS'); await fill('#workflow-name', 'Customer Success'); await click('Save'); await closed();
  await switchTab('stages'); await until('document.querySelector("article").textContent.includes("CS - Customer Success")');
  await check('Array.from(document.querySelectorAll("article p")).every(n => getComputedStyle(n).color === "rgb(167, 139, 250)")', 'edited color updates all stage role labels');
  await check('Array.from(document.querySelectorAll("article")).every(n => n.textContent.includes("CS - Customer Success"))', 'role edits update all stage labels');
  await wait(200);
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-workflow-desktop.png', Buffer.from(result.data, 'base64')));
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await check('document.documentElement.scrollWidth <= 375', 'stage layout fits mobile');
  await wait(200);
  await command('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFile('/tmp/enquiry-workflow-mobile.png', Buffer.from(result.data, 'base64')));
  await evaluate('window.workflowChecks.fail = true');
  await aria('Move Contact up');
  await until('Array.from(document.querySelectorAll("[data-sonner-toast]")).some(n => n.textContent.includes("Test save failed"))');
  await until('document.querySelector("article h2").textContent === "Qualification"');
  await check('window.workflowChecks.workflow.stages[0].name === "Qualification"', 'failed reorder restores persisted stage order');
  await evaluate('window.workflowChecks.fail = false');
  await switchTab('roles'); await aria('Delete role CS'); await until('document.querySelector("[role=alertdialog]")');
  await check('window.workflowChecks.workflow.roles.length === 1', 'deletion waits for confirmation');
  await click('Delete'); await until('document.querySelector("[data-sonner-toast]")?.textContent.includes("Reassign or delete")');
  await check('!!document.querySelector("[role=alertdialog]") && window.workflowChecks.workflow.roles.length === 1', 'assigned roles cannot be deleted');
  await click('Cancel'); await closed();
  await switchTab('stages');
  for (const name of ['Qualification', 'Contact']) {
    await aria(`Delete stage ${name}`); await until('document.querySelector("[role=alertdialog]")'); await click('Delete'); await closed();
  }
  await until('document.body.textContent.includes("No stages yet")');
  await switchTab('roles'); await aria('Delete role CS'); await until('document.querySelector("[role=alertdialog]")'); await click('Delete'); await closed();
  await until('document.body.textContent.includes("No roles yet")');
  await click('Add Role'); await until('document.querySelector("#role-subname")'); await fill('#role-subname', 'AM'); await fill('#workflow-name', 'Manager');
  await evaluate('window.workflowChecks.fail = true'); await click('Save');
  await until('Array.from(document.querySelectorAll("[data-sonner-toast]")).some(n => n.textContent.includes("Test save failed"))');
  await check('!!document.querySelector("[role=dialog]") && window.workflowChecks.workflow.roles.length === 0', 'failed save preserves dialog and persisted data');
  await evaluate('window.workflowChecks.fail = false'); await click('Save'); await closed();
  await check('window.workflowChecks.errors.length === 0', 'save errors are handled locally');
  if (browserErrors.length) throw new Error(browserErrors.join('\n'));
} finally {
  socket?.close();
  if (browser?.pid && browser.exitCode === null) { const exited = once(browser, 'exit'); browser.kill('SIGTERM'); await exited; }
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
