import { readFile, access, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions.toSorted(), ['alarms', 'storage']);
assert.deepEqual(manifest.optional_permissions, ['notifications']);
assert.deepEqual(manifest.host_permissions, ['https://raw.githubusercontent.com/*']);
assert.equal(manifest.content_scripts, undefined);
assert.equal(manifest.externally_connectable, undefined);
assert.equal(manifest.background.type, 'module');
const directives = manifest.content_security_policy.extension_pages.split(';').map(value => value.trim());
assert.ok(directives.includes("script-src 'self'"));
assert.ok(directives.includes("object-src 'none'"));
assert.ok(!/unsafe-eval|unsafe-inline/.test(manifest.content_security_policy.extension_pages));
const files = [manifest.action.default_popup, manifest.background.service_worker, ...Object.values(manifest.icons)];
for (const file of files) await access(join(root, file));
for (const file of ['popup.html', 'devtools.html']) {
  const html = await readFile(join(root, file), 'utf8');
  assert.ok(!/\son\w+\s*=/i.test(html), `Inline event handler: ${file}`);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html), `Inline script: ${file}`);
  for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+)(?:#[^"]*)?"/g)) {
    if (!/^https?:/.test(path)) await access(join(root, path));
  }
}
for (const name of await readdir(join(root, 'src'))) {
  const text = await readFile(join(root, 'src', name), 'utf8');
  assert.ok(!/\beval\s*\(|new Function\s*\(|\.innerHTML\s*=/.test(text), `Unsafe code: ${name}`);
  for (const [, path] of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) await access(resolve(root, 'src', path));
}
const fixture = JSON.parse(await readFile(join(root, 'fixtures/latest.json'), 'utf8'));
assert.equal(Object.keys(fixture.prices).length, 82);
for (const size of [16, 32, 48, 128]) {
  const png = await readFile(join(root, `icons/icon-${size}.png`));
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
console.log('Manifest V3, permissions, local references, CSP, packaged icons and fixture: OK');
