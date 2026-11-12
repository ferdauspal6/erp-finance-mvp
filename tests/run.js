'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const files = [
  'js/format.js',
  'js/glosarium.js',
  'js/store.js',
  'js/ledger.js',
  'js/report.js',
  'js/roles.js',
  'js/auth.js',
  'js/numbering.js',
  'js/master.js',
  'js/inventory.js',
  'js/purchasing.js',
  'js/receiving.js',
  'js/returns.js',
  'js/reconcile.js',
  'js/seed.js',
  'js/seed-purchasing.js',
  'js/selftest.js',
  'js/selftest-purchasing.js'
];

const context = {
  console,
  Date,
  Math,
  JSON,
  parseInt,
  parseFloat,
  isFinite,
  String,
  Number,
  Object,
  Array,
  Boolean,
  RegExp,
  setTimeout,
  clearTimeout
};
context.globalThis = context;
context.window = undefined;
context.localStorage = undefined;
vm.createContext(context);

files.forEach((file) => {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
});

function print(label, result) {
  console.log(`\n${label}: ${result.passed} passed, ${result.failed} failed`);
  result.results
    .filter((row) => !row.ok)
    .forEach((row) => {
      console.log(`  FAIL ${row.name}: actual=${JSON.stringify(row.actual)} expected=${JSON.stringify(row.expected)}`);
    });
}

const accounting = context.SelfTest.run();
const purchasing = context.SelfTestPurchasing.run();
print('Accounting selftest', accounting);
print('Purchasing selftest', purchasing);

if (!accounting.ok || !purchasing.ok) process.exit(1);
