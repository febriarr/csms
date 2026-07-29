import * as fs from 'node:fs';
import * as path from 'node:path';

const copies = [
  {
    from: 'node_modules/htmx.org/dist/htmx.min.js',
    to: 'public/vendor/htmx.min.js',
  },
  {
    from: 'node_modules/@alpinejs/csp/dist/cdn.min.js',
    to: 'public/vendor/alpine.min.js',
  },
];

for (const { from, to } of copies) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`Copied ${from} -> ${to}`);
}
