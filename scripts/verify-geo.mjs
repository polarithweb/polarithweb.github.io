import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGES = [
  'index.html',
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

const MIRRORED_FILES = ['llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runChecks() {
  let passed = 0;

  // 1. Validate unified JSON-LD @graph, semantic <main>, and zero raw markdown in all 5 pages
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
    for (const entity of ['Priyam Kesh', 'Polarith', 'Polarith Software', 'Polarith Web', 'Polarith Management Softwares']) {
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

  console.log(`GEO verification passed (${passed} test groups, 0 failures).`);
}

runChecks();
