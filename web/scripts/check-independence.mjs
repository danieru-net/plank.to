// Verifies the website is independent of the app: no planner data, no app
// credentials/secrets, no Firebase database/auth/client usage, no connections
// to planner storage, and every built page is static HTML.
// Usage: node scripts/check-independence.mjs [--no-build]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];
const fail = (msg) => failures.push(msg);

if (!process.argv.includes('--no-build')) {
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
}

function walk(dir, skip = () => false) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip(p, name)) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, skip));
    else out.push(p);
  }
  return out;
}
const rel = (p) => relative(root, p).split(sep).join('/');
const TEXT = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.svg',
  '.xml',
  '.txt',
  '.webmanifest',
  '.map',
  '.astro',
  '.ts',
  '.md',
]);

// Things that must never appear in the site, in source or in the build.
const forbidden = [
  [
    'Firebase client SDK',
    /\bfirebase\/(app|auth|firestore|database|functions|storage)\b|@firebase\/|\bfirebase-(admin|functions)\b/i,
  ],
  [
    'Firebase client call',
    /\b(initializeApp|getFirestore|getAuth|getDatabase|signInWith\w*|onAuthStateChanged|collection\(|getDoc\(|setDoc\()/,
  ],
  [
    'Firebase/Google backend endpoint',
    /firestore\.googleapis\.com|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|cloudfunctions\.net|\.firebaseapp\.com/i,
  ],
  ['Firebase config object', /firebaseConfig|\bmessagingSenderId\b|\bappId\s*:\s*['"]\d/],
  [
    'Planner storage (SQLite/expo)',
    /expo-sqlite|\bopenDatabase(Sync|Async)?\b|node:sqlite|better-sqlite3/,
  ],
  [
    'Planner table/record name',
    /\b(occurrence_overrides|clothing_options|weather_location_settings)\b/,
  ],
  ['Import from app/', /from\s+['"](\.\.\/)+app\/|require\(['"](\.\.\/)+app\//],
  [
    'Credential-looking string',
    /AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|"private_key"\s*:|"client_email"\s*:[^,]*iam\.gserviceaccount|\bgh[pousr]_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9]{32,}/,
  ],
  [
    'Secret assignment',
    /\b(api[_-]?key|secret|password|auth[_-]?token|access[_-]?token|service[_-]?account)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
  ],
  [
    'Environment secret access',
    /process\.env\.|import\.meta\.env\.(?!BASE_URL|MODE|DEV|PROD|SITE|SSR)/,
  ],
  [
    'Browser data connection',
    /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|EventSource|navigator\.sendBeacon|indexedDB|localStorage|sessionStorage/,
  ],
];

function scan(files, label) {
  for (const f of files) {
    if (!TEXT.has(extname(f))) continue;
    const text = readFileSync(f, 'utf8');
    for (const [name, re] of forbidden) {
      const m = text.match(re);
      if (m) fail(`${label} ${rel(f)}: ${name} (${JSON.stringify(m[0].slice(0, 60))})`);
    }
  }
}

// 1. Source: everything in web/ that ships or builds the site.
const skipSrc = (p, name) =>
  ['node_modules', 'dist', '.astro', 'scripts'].includes(name) ||
  (name.startsWith('.') && name !== '.') ||
  p.endsWith('package-lock.json');
const sourceFiles = walk(root, skipSrc).filter((f) => !/(^|\/)(README|AGENTS)\.md$/.test(rel(f)));
scan(sourceFiles, 'source');

// Env files and key material must not exist in web/.
for (const f of walk(root, (p, n) => ['node_modules', 'dist', '.astro'].includes(n))) {
  if (
    /(^|\/)\.env(\..*)?$|\.(pem|p12|keystore)$|serviceAccount|service-account|google-services\.json|GoogleService-Info\.plist/i.test(
      rel(f),
    )
  ) {
    fail(`source ${rel(f)}: credential/env file must not live in web/`);
  }
}

// 2. Dependencies and config: no Firebase/DB/server adapters.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (
    /firebase|firestore|sqlite|expo|react-native|supabase|mongo|prisma|^@astrojs\/(node|vercel|netlify|cloudflare|react|vue|svelte|solid-js|preact|alpinejs)$/.test(
      dep,
    )
  ) {
    fail(`package.json: dependency "${dep}" implies app/server/database coupling`);
  }
}
const astroConfig = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
if (/adapter\s*:|output\s*:\s*['"]server['"]|output\s*:\s*['"]hybrid['"]/.test(astroConfig)) {
  fail('astro.config.mjs: server adapter/output is not allowed (static only)');
}
for (const f of walk(join(root, 'src'))) {
  if (
    /(^|\/)src\/pages\/.*\.(ts|js)$/.test(rel(f)) ||
    /export\s+const\s+prerender\s*=\s*false/.test(readFileSync(f, 'utf8'))
  ) {
    fail(`source ${rel(f)}: endpoint or non-prerendered route needs server code`);
  }
}
const firebase = JSON.parse(readFileSync(join(dirname(root), 'firebase.json'), 'utf8'));
for (const key of Object.keys(firebase)) {
  if (key !== 'hosting')
    fail(`firebase.json: "${key}" config found; the site may only use Hosting`);
}
if (firebase.hosting?.rewrites?.some((r) => r.function || r.run || r.functions)) {
  fail('firebase.json: hosting rewrites to functions/Cloud Run are not allowed');
}
if (firebase.hosting?.public !== 'web/dist') fail('firebase.json: hosting.public must be web/dist');

// 3. Build output: static files only, no server code, no forbidden content.
if (!existsSync(dist)) {
  fail('dist/ is missing; build failed or did not run');
} else {
  const distFiles = walk(dist);
  scan(distFiles, 'dist');
  const staticExt = new Set([
    '.html',
    '.css',
    '.js',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.txt',
    '.xml',
    '.json',
    '.webmanifest',
    '.avif',
    '.gif',
    '.map',
  ]);
  for (const f of distFiles) {
    const e = extname(f).toLowerCase();
    if (!staticExt.has(e)) fail(`dist ${rel(f)}: unexpected file type "${e}" (server code?)`);
    if (/(^|\/)(_worker\.js|server|functions|_routes\.json)(\/|$)/.test(rel(f)))
      fail(`dist ${rel(f)}: server artifact`);
  }

  // Every page in src/pages must have a built index.html (or .html).
  const pages = readdirSync(join(root, 'src/pages'))
    .filter((n) => n.endsWith('.astro'))
    .map((n) => n.replace(/\.astro$/, ''));
  const htmlFiles = distFiles.filter((f) => f.endsWith('.html'));
  for (const name of pages) {
    const out =
      name === 'index'
        ? join(dist, 'index.html')
        : name === '404'
          ? join(dist, '404.html')
          : join(dist, name, 'index.html');
    if (!existsSync(out)) fail(`dist: page "${name}" has no static HTML output`);
  }

  const exists = (p) =>
    existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    const r = rel(f);
    if (!/^\s*<!doctype html>/i.test(html)) fail(`dist ${r}: missing doctype`);
    if (!/<html[^>]*\blang=/i.test(html)) fail(`dist ${r}: missing <html lang>`);
    if (!/<\/html>\s*$/i.test(html)) fail(`dist ${r}: not a complete HTML document`);
    if (/<form\b[^>]*\baction=/i.test(html)) fail(`dist ${r}: form posts to a server`);
    if (/<(iframe|object|embed)\b/i.test(html)) fail(`dist ${r}: embeds external content`);
    if (/<astro-island|server:defer|data-astro-server/i.test(html))
      fail(`dist ${r}: needs server/island runtime`);
    // External resources: no third-party scripts, styles, or fonts.
    for (const m of html.matchAll(
      /<(script|link|img|source)\b[^>]*\b(?:src|href)=["'](https?:)?\/\/[^"']+/gi,
    )) {
      if (!/^<a\b/i.test(m[0]) && !/rel=["'](canonical|alternate)["']/i.test(m[0]))
        fail(`dist ${r}: external resource ${JSON.stringify(m[0].slice(0, 80))}`);
    }
    // Local references must resolve to files that exist in dist.
    for (const m of html.matchAll(/\b(?:src|href)=["']([^"'#?]+)/gi)) {
      const ref = m[1];
      if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) {
        if (/^(https?|mailto|tel):/i.test(ref) || /^\/\//.test(ref)) continue;
        fail(`dist ${r}: unexpected URL scheme in ${ref}`);
        continue;
      }
      const target = ref.startsWith('/') ? join(dist, ref) : resolve(dirname(f), ref);
      if (!exists(target)) fail(`dist ${r}: broken local reference ${ref}`);
    }
  }
}

if (failures.length) {
  console.error(`\nIndependence check FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  'Independence check passed: static HTML only, no planner data, secrets, or Firebase/database clients.',
);
