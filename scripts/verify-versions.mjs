import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const expected = {
  genu: '5.5.0',
  node: '22.23.2',
  npm: '10.9.8',
};

const readText = async (path) => (await readFile(path, 'utf8')).trim();
const readJson = async (path) => JSON.parse(await readText(path));

const packageJson = await readJson('package.json');
const packageLock = await readJson('package-lock.json');
const npmVersion =
  process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1];

assert.equal(packageJson.version, expected.genu, 'package.json GenU version');
assert.equal(
  packageLock.version,
  expected.genu,
  'package-lock.json GenU version'
);
assert.equal(
  packageLock.packages[''].version,
  expected.genu,
  'root lock version'
);
assert.equal(
  packageJson.packageManager,
  `npm@${expected.npm}`,
  'package manager'
);
assert.equal(packageJson.engines.node, expected.node, 'Node engine');
assert.equal(packageJson.engines.npm, expected.npm, 'npm engine');
assert.equal(await readText('.nvmrc'), expected.node, '.nvmrc Node version');
assert.equal(
  await readText('.node-version'),
  expected.node,
  '.node-version Node version'
);
assert.equal(process.version, `v${expected.node}`, 'running Node version');
assert.equal(npmVersion, expected.npm, 'running npm version');

console.log(
  `Verified GenU ${expected.genu}, Node.js ${expected.node}, npm ${expected.npm}`
);
