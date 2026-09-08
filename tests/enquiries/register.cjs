// Compile the repository's TypeScript in memory; no generated test files or new runner dependency.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};
const originalLoad = Module._load;
global.enquiryTestSession = null;
Module._load = function (request, parent, ...rest) {
  if (request === '@/auth') return { auth: async () => global.enquiryTestSession };
  if (request === '@/app/api/helpers/enquiry-notifications') return { notifyEnquiryForward: async () => {} };
  return originalLoad.call(this, request, parent, ...rest);
};
