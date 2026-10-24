import { readFile, writeFile } from 'node:fs/promises';
const configured = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
let origin = '';
if (configured) {
  const url = new URL(configured);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL must be an HTTP(S) origin, without a path, credentials, query, or fragment.');
  origin = url.origin;
}
const preview = process.env.VERCEL_ENV === 'preview';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const template = await readFile('dist/index.html', 'utf8');
const pages = [
  { path: '/', file: 'index.html', title: 'Meowdoku Solver — Upload, Build & Solve Cat Puzzles', description: 'Solve Meowdoku cat puzzles from a screenshot or build your own 4×4 to 12×12 board. Free, private, and available offline as an installable app.', heading: 'Meowdoku cat puzzle solver', content: 'Upload a screenshot or create a colorful board, then find where every cat belongs. Choose a 4×4 to 12×12 grid, paint its regions, and explore the solutions.' },
  { path: '/algorithm-comparison', file: 'algorithm-comparison.html', title: 'Meowdoku Algorithm Comparison — Backtracking & Deductions', description: 'Build, upload, or import a Meowdoku board and compare backtracking with deduction-based solving. Explore solutions, timings, guesses, and search statistics.', heading: 'Compare Meowdoku solving algorithms', content: 'Use the shared board builder, screenshot importer, or JSON input to compare backtracking and propagation on the same puzzle. Explore solution sets, guesses, forced placements, and search times.' },
];
for (const page of pages) {
  const canonical = origin + page.path;
  const schema = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Meowdoku Solver', description: page.description, applicationCategory: 'GameApplication', operatingSystem: 'Any', isAccessibleForFree: true, ...(origin ? { url: canonical } : {}) };
  const metadata = `
    <meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow'}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Meowdoku Solver" />
    <meta property="og:title" content="${escape(page.title)}" />
    <meta property="og:description" content="${escape(page.description)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escape(page.title)}" />
    <meta name="twitter:description" content="${escape(page.description)}" />
    ${origin ? `<link rel="canonical" href="${escape(canonical)}" /><meta property="og:url" content="${escape(canonical)}" /><meta property="og:image" content="${escape(origin)}/icons/icon-512.png" /><meta property="og:image:alt" content="Meowdoku cat icon" /><meta name="twitter:image" content="${escape(origin)}/icons/icon-512.png" />` : ''}
    <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\u003c')}</script>`;
  const content = `<main><h1>${page.heading}</h1><p>${page.content}</p><h2>How to play</h2><p>Place exactly one cat in each row, column, and color region. Cats cannot touch, even diagonally.</p><h2>Private and available offline</h2><p>Screenshot processing and solving happen on your device. Install the app and open it online once to prepare offline access.</p><nav aria-label="Pages"><a href="/">Build and solve a puzzle</a> · <a href="/algorithm-comparison">Compare solvers</a></nav><noscript><p>Enable JavaScript to use the interactive board editor and solver.</p></noscript></main>`;
  const html = template.replace(/<title>.*?<\/title>/s, `<title>${escape(page.title)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(page.description)}" />`).replace('</head>', metadata + '\n</head>').replace(/<div id="app">.*?<\/div>/s, `<div id="app">${content}</div>`);
  await writeFile('dist/' + page.file, html);
}
await writeFile('dist/robots.txt', preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`);
if (origin && !preview) await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${escape(origin + page.path)}</loc></url>`).join('')}</urlset>`);
console.log(`SEO: generated both pages, sharing metadata, and robots.txt${origin && !preview ? ' + sitemap.xml' : ''}.`);
if (!origin) console.log('Set SITE_URL at build time to enable canonical URLs, sharing images, and sitemap.xml.');
