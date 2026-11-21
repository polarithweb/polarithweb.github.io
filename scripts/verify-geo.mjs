import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGES = [
  'index.html',
  'management-softwares.html',
  'priyam-kesh.html',
  'ai-lab.html',
  'game-development.html',
  'blogs.html',
];

const REQUIRED_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Google-Extended',
  'Googlebot',
  'ClaudeBot',
  'Claude-Web',
  'PerplexityBot',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
];

const REQUIRED_FAQS = [
  'Who is Priyam Kesh?',
  'What is Polarith Software?',
  'What services does Polarith Web offer?',
  'What are Polarith Management Softwares?',
];

const MANAGEMENT_REQUIRED_SUITES = [
  'https://polarithweb.github.io/#polarith-management-softwares-app',
  'https://polarithweb.github.io/management-softwares.html#school-management-suite',
  'https://polarithweb.github.io/management-softwares.html#gym-management-suite',
  'https://polarithweb.github.io/management-softwares.html#nursing-home-suite',
  'https://polarithweb.github.io/management-softwares.html#smart-society-suite',
];

const MANAGEMENT_IMAGES = [
  'polarith-management-softwares-hero.jpg',
  'polarith-school-management-erp-library.jpg',
  'polarith-gym-management-software.jpg',
  'polarith-nursing-home-management-software.jpg',
  'polarith-smart-society-apartment-software.jpg',
  'polarith-encrypted-database-servers.jpg',
];

const MIRRORED_FILES = [
  'llms.txt',
  'llms-full.txt',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'favicon.ico',
  'favicon-48x48.png',
  'favicon-96x96.png',
  'favicon-192x192.png',
  'apple-touch-icon.png',
  'favicon.png',
  'logo.png',
];

const EXPECTED_PNG_ICONS = [
  ['favicon-48x48.png', 48, 48],
  ['favicon-96x96.png', 96, 96],
  ['favicon-192x192.png', 192, 192],
  ['apple-touch-icon.png', 180, 180],
  ['favicon.png', 512, 512],
  ['logo.png', 512, 512],
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runChecks() {
  let passed = 0;

  // 1. Validate unified JSON-LD @graph, semantic <main>, and zero raw markdown in all 6 pages
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.equal(scripts.length, 1, `${page}: expected exactly 1 unified JSON-LD script, got ${scripts.length}`);

    const json = JSON.parse(scripts[0][1]);
    assert.ok(Array.isArray(json['@graph']), `${page}: missing @graph array`);

    const byId = new Map(json['@graph'].filter((n) => n && n['@id']).map((n) => [n['@id'], n]));
    const org = byId.get('https://polarithweb.github.io/#organization');
    const person = byId.get('https://polarithweb.github.io/priyam-kesh.html#person');
    const website = byId.get('https://polarithweb.github.io/#website');
    const hasBreadcrumb = json['@graph'].some((n) => n && n['@type'] === 'BreadcrumbList');

    assert.ok(org && org.name === 'Polarith', `${page}: missing Organization #organization named Polarith`);
    for (const alt of ['Polarith Software', 'Polarith Web', 'Polarith Management Softwares']) {
      assert.ok(Array.isArray(org.alternateName) && org.alternateName.includes(alt), `${page}: missing alternateName "${alt}"`);
    }
    assert.ok(person && person.name === 'Priyam Kesh', `${page}: missing Person #person named Priyam Kesh`);
    assert.equal(website?.publisher?.['@id'], 'https://polarithweb.github.io/#organization', `${page}: WebSite publisher mismatch`);
    assert.ok(hasBreadcrumb, `${page}: missing BreadcrumbList inside @graph`);
    assert.ok(html.includes('<main') && html.includes('</main>'), `${page}: missing <main> landmark`);

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    assert.ok(bodyMatch, `${page}: missing <body>`);
    const visibleBody = bodyMatch[1].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
    assert.ok(!/\*\*[A-Za-z]/.test(visibleBody), `${page}: literal markdown asterisks found in rendered HTML`);

    for (const iconRef of [
      'href="./favicon.ico"',
      'href="./favicon-48x48.png"',
      'href="./favicon-96x96.png"',
      'href="./favicon-192x192.png"',
      'href="./favicon.png"',
      'href="./apple-touch-icon.png"',
      'href="./site.webmanifest"',
    ]) {
      assert.ok(html.includes(iconRef), `${page}: missing static favicon/manifest link ${iconRef}`);
    }

    if (page === 'index.html') {
      const faqNode = json['@graph'].find((n) => n && n['@type'] === 'FAQPage');
      assert.ok(faqNode, 'index.html: missing FAQPage node');
      const faqNames = new Set((faqNode.mainEntity || []).map((q) => q.name));
      for (const q of REQUIRED_FAQS) {
        assert.ok(faqNames.has(q), `index.html: FAQPage schema missing "${q}"`);
        assert.ok(html.includes(q), `index.html: visible HTML missing FAQ "${q}"`);
      }
      for (const id of [
        'https://polarithweb.github.io/#polarith-software-app',
        'https://polarithweb.github.io/#polarith-web-service',
        'https://polarithweb.github.io/#polarith-management-softwares-app',
      ]) {
        assert.ok(byId.has(id), `index.html: missing division entity ${id}`);
      }
      assert.ok(html.includes('id="modal-database"') && html.includes('polarith-encrypted-database-servers.jpg'), 'index.html: missing Database Management modal or server image');
    }

    if (page === 'management-softwares.html') {
      for (const id of MANAGEMENT_REQUIRED_SUITES) {
        assert.ok(byId.has(id), `management-softwares.html: missing SoftwareApplication node ${id}`);
      }
      const faqNode = json['@graph'].find((n) => n && n['@type'] === 'FAQPage');
      assert.ok(faqNode && Array.isArray(faqNode.mainEntity) && faqNode.mainEntity.length >= 6, 'management-softwares.html: expected >= 6 FAQPage items');
      for (const entry of faqNode.mainEntity) {
        assert.ok(html.includes(entry.name), `management-softwares.html: visible HTML missing FAQ question "${entry.name}"`);
      }
      assert.ok(html.includes('918345890843') && html.includes('priaxom.ai@outlook.com'), 'management-softwares.html: missing official WhatsApp/email contact');
      assert.ok(!html.includes('87594 90480') && !html.includes('8759490480'), 'management-softwares.html: forbidden secondary phone number found');
      assert.ok(!html.includes('polarithweb@gmail.com'), 'management-softwares.html: forbidden secondary email found');
      assert.ok(!html.includes('window.open(') && !html.includes('window.alert('), 'management-softwares.html: avoid window.open/window.alert');
    }

    passed++;
  }

  // 2. Validate robots.txt AI crawler allowances and sitemap/llms references
  const robots = fs.readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');
  for (const bot of REQUIRED_BOTS) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt: missing User-agent: ${bot}`);
  }
  assert.ok(robots.includes('https://polarithweb.github.io/sitemap.xml'), 'robots.txt: missing sitemap.xml URL');
  assert.ok(robots.includes('https://polarithweb.github.io/llms.txt'), 'robots.txt: missing llms.txt URL');
  passed++;

  // 3. Validate llms.txt & llms-full.txt required entities & absence of placeholders
  for (const doc of ['public/llms.txt', 'public/llms-full.txt']) {
    const text = fs.readFileSync(path.join(ROOT, doc), 'utf8');
    for (const entity of ['Priyam Kesh', 'Polarith', 'Polarith Software', 'Polarith Web', 'Polarith Management Softwares', 'management-softwares.html']) {
      assert.ok(text.includes(entity), `${doc}: missing entity "${entity}"`);
    }
    for (const placeholder of ['TODO', 'Lorem ipsum', 'example.com']) {
      assert.ok(!text.toLowerCase().includes(placeholder.toLowerCase()), `${doc}: placeholder found "${placeholder}"`);
    }
    passed++;
  }

  // 4. Validate sitemap.xml coverage
  const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
  for (const url of [
    'https://polarithweb.github.io/',
    'https://polarithweb.github.io/management-softwares.html',
    'https://polarithweb.github.io/priyam-kesh.html',
    'https://polarithweb.github.io/ai-lab.html',
    'https://polarithweb.github.io/game-development.html',
    'https://polarithweb.github.io/blogs.html',
    'https://polarithweb.github.io/llms.txt',
    'https://polarithweb.github.io/llms-full.txt',
  ]) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: missing <loc>${url}</loc>`);
  }
  passed++;

  // 5. Verify public/ and repo-root mirror parity (plus dist/ if built)
  for (const file of MIRRORED_FILES) {
    const pubHash = sha256(path.join(ROOT, 'public', file));
    const rootHash = sha256(path.join(ROOT, file));
    assert.equal(rootHash, pubHash, `Mirror mismatch between public/${file} and ${file}`);
    const distFile = path.join(ROOT, 'dist', file);
    if (fs.existsSync(distFile)) {
      assert.equal(sha256(distFile), pubHash, `Build mismatch between public/${file} and dist/${file}`);
    }
  }
  passed++;

  // 6. Verify all 5 Management Softwares images exist and match across public/assets/images and assets/images
  for (const img of MANAGEMENT_IMAGES) {
    const pubImg = path.join(ROOT, 'public/assets/images', img);
    const rootImg = path.join(ROOT, 'assets/images', img);
    assert.ok(fs.existsSync(pubImg), `Missing public image: ${pubImg}`);
    assert.ok(fs.existsSync(rootImg), `Missing root mirror image: ${rootImg}`);
    assert.equal(sha256(rootImg), sha256(pubImg), `Image mirror mismatch for ${img}`);
    const distImg = path.join(ROOT, 'dist/assets/images', img);
    if (fs.existsSync(distImg)) {
      assert.equal(sha256(distImg), sha256(pubImg), `Build image mismatch for ${img}`);
    }
  }
  passed++;

  // 7. Verify genuine PNG headers & exact dimensions for all static favicons/logo, plus multi-size favicon.ico
  for (const [file, expectedW, expectedH] of EXPECTED_PNG_ICONS) {
    const buf = fs.readFileSync(path.join(ROOT, 'public', file));
    assert.ok(buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47, `public/${file}: not a genuine PNG file`);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, expectedW, `public/${file}: expected width ${expectedW}, got ${width}`);
    assert.equal(height, expectedH, `public/${file}: expected height ${expectedH}, got ${height}`);
  }
  const icoBuf = fs.readFileSync(path.join(ROOT, 'public/favicon.ico'));
  assert.ok(icoBuf.length > 22 && icoBuf.readUInt16LE(0) === 0 && icoBuf.readUInt16LE(2) === 1, 'public/favicon.ico: not a valid ICO file');
  assert.ok(icoBuf.readUInt16LE(4) >= 3, 'public/favicon.ico: expected at least 3 embedded icon sizes (16, 32, 48)');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/site.webmanifest'), 'utf8'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'public/site.webmanifest: missing icons array');
  passed++;

  console.log(`GEO verification passed (${passed} test groups, 0 failures).`);
}

runChecks();
