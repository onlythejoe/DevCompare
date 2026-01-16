const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const BASE_URL = 'https://devcompare.github.io';
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES_PATH = path.join(__dirname, '..', 'data', 'generated', 'pages.json');

function applyTemplate(template, replacements) {
  return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key] || '');
}

function readTemplate(name) {
  const templatePath = path.join(__dirname, '..', 'templates', name);
  return fs.readFileSync(templatePath, 'utf8');
}

async function build() {
  if (!fs.existsSync(PAGES_PATH)) {
    throw new Error('No generated pages metadata found. Run the pipeline first.');
  }

  const pages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
  const pageTemplate = readTemplate('page.html');
  const homeTemplate = readTemplate('home.html');
  const rssTemplate = readTemplate('rss.xml');
  const sitemapTemplate = readTemplate('sitemap.xml');
  const robotsTemplate = readTemplate('robots.txt');
  const md = new MarkdownIt({ html: true });

  await fs.promises.mkdir(PUBLIC_DIR, { recursive: true });

  const cardHtml = pages
    .map((page) => {
      return `
        <article class="card">
          <h3><a href="/${page.slug}.html">${page.title}</a></h3>
          <p>${page.description}</p>
          <small>${page.type} · Updated ${new Date(page.date).toLocaleDateString()}</small>
        </article>
      `;
    })
    .join('\n');

  const homeHtml = applyTemplate(homeTemplate, {
    feeds: cardHtml
  });

  await fs.promises.writeFile(path.join(PUBLIC_DIR, 'index.html'), homeHtml);

  const rssItems = pages
    .map((page) => {
      return `
        <item>
          <title>${page.title}</title>
          <link>${BASE_URL}/${page.slug}.html</link>
          <description>${page.description}</description>
          <pubDate>${new Date(page.date).toUTCString()}</pubDate>
        </item>
      `;
    })
    .join('\n');

  const rssXml = applyTemplate(rssTemplate, {
    baseUrl: BASE_URL,
    items: rssItems
  });
  await fs.promises.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), rssXml);

  const sitemapItems = pages
    .map((page) => {
      return `
        <url>
          <loc>${BASE_URL}/${page.slug}.html</loc>
          <lastmod>${page.date}</lastmod>
        </url>
      `;
    })
    .join('\n');

  const sitemapXml = applyTemplate(sitemapTemplate, {
    items: sitemapItems
  });
  await fs.promises.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml);

  const robots = applyTemplate(robotsTemplate, {
    baseUrl: BASE_URL
  });
  await fs.promises.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), robots);

  for (const page of pages) {
    const markdownPath = path.join(CONTENT_DIR, `${page.slug}.md`);
    if (!fs.existsSync(markdownPath)) continue;
    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const contentHtml = md.render(markdown);
    const pageHtml = applyTemplate(pageTemplate, {
      title: page.title,
      description: page.description,
      url: `${BASE_URL}/${page.slug}.html`,
      content: contentHtml
    });
    await fs.promises.writeFile(path.join(PUBLIC_DIR, `${page.slug}.html`), pageHtml);
  }
}

module.exports = build;
