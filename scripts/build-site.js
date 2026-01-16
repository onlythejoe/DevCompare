const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const BASE_URL = 'https://onlythejoe.github.io/DevCompare';
const PAGES_PATH = path.join(__dirname, '..', 'data', 'generated', 'pages.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs');
const PAGE_SUBDIR = 'pages';

const CATEGORIES = require('../config/categories.json');

const NAV_LINKS = [
  { label: 'Home', href: 'index.html' },
  { label: 'Categories', href: 'categories.html' },
  { label: 'Archive', href: 'archive.html' },
  { label: 'Latest', href: 'latest.html' },
  { label: 'About', href: 'about.html' }
];

const TYPE_LABELS = {
  'best-tools': 'Tool picks',
  'top-software': 'Observability',
  comparison: 'Comparison',
  'weekly-roundup': 'Weekly releases'
};

const CATEGORY_ALIASES = {
  'developer-productivity': 'dev-tools',
  'design-prototyping': 'design'
};

const CATEGORY_SECTIONS = [
  { title: 'Tools', types: ['best-tools', 'top-software'] },
  { title: 'Comparisons', types: ['comparison'] },
  { title: 'Weekly releases', types: ['weekly-roundup'] }
];

function applyTemplate(template, replacements) {
  return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key] || '');
}

function readTemplate(name) {
  const templatePath = path.join(__dirname, '..', 'templates', name);
  return fs.readFileSync(templatePath, 'utf8');
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function renderNav(prefix = '') {
  const links = NAV_LINKS.map((link) => `<a href="${prefix}${link.href}">${link.label}</a>`).join('');
  return `
    <nav class="site-nav">
      <div class="site-logo">
        <span>DevCompare</span>
        <small>Persistent DevOps intelligence</small>
      </div>
      <div class="nav-links">
        ${links}
      </div>
    </nav>
  `;
}

function renderCard(entry) {
  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
  const dateLabel = formatDate(entry.publishedDate);
  const categories = entry.categories
    .map((category) => `<span class="pill">${category.name}</span>`)
    .join('');
  const highlights = entry.toolHighlights.length ? entry.toolHighlights.join(' · ') : '';

  return `
    <article class="card">
      <div class="card-meta">
        <span class="pill primary">${typeLabel}</span>
        <span class="meta">${dateLabel}</span>
      </div>
      <h3><a href="${entry.url}">${entry.title}</a></h3>
      <p>${entry.description}</p>
      ${highlights ? `<p class="highlights">Highlights: ${highlights}</p>` : ''}
      <div class="chips">${categories}</div>
    </article>
  `;
}

function renderListItem(entry) {
  const label = TYPE_LABELS[entry.type] || entry.type;
  const dateLabel = formatDate(entry.publishedDate);
  const categoryLabel = entry.categories.length
    ? entry.categories.map((category) => category.name).join(' · ')
    : 'General';

  return `
    <li>
      <div class="list-line">
        <a href="${entry.url}">${entry.title}</a>
        <span class="pill">${label}</span>
      </div>
      <div class="list-meta">
        <span>Published ${dateLabel}</span>
        <span>${categoryLabel}</span>
      </div>
    </li>
  `;
}

function renderCategorySections(category, entries) {
  const filtered = entries.filter((entry) =>
    entry.categories.some((item) => item.slug === category.slug)
  );
  const sections = CATEGORY_SECTIONS.map((bucket) => {
    const bucketEntries = filtered
      .filter((entry) => bucket.types.includes(entry.type))
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
    const bucketContent = bucketEntries.length
      ? bucketEntries.map(renderListItem).join('')
      : `<li class="empty">No ${bucket.title.toLowerCase()} snapshots yet.<span class="hint">New archives add here automatically.</span></li>`;

    return `
      <section class="category-block">
        <h3>${bucket.title}</h3>
        <ul class="list">${bucketContent}</ul>
      </section>
    `;
  });
  return sections.join('');
}

function renderArchiveSection(year, entries) {
  const chunk = entries
    .filter((entry) => new Date(entry.publishedDate).getFullYear() === year)
    .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
  if (!chunk.length) {
    return '';
  }

  return `
    <section class="archive-year">
      <div class="section-heading">
        <h2>${year}</h2>
        <a href="archive-${year}.html" class="micro-link">Yearly snapshot</a>
      </div>
      <ul class="list">${chunk.map(renderListItem).join('')}</ul>
    </section>
  `;
}

async function buildArticles(allPages, templates, navArticles, md) {
  for (const entry of allPages) {
    const entryPath = path.join(OUTPUT_DIR, entry.url);
    if (fs.existsSync(entryPath)) {
      continue;
    }
    const markdownPath = path.join(__dirname, '..', entry.markdownPath);
    if (!fs.existsSync(markdownPath)) {
      continue;
    }
    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const contentHtml = md.render(markdown);
    const articleHtml = applyTemplate(templates.pageTemplate, {
      title: entry.title,
      description: entry.metaDescription || entry.summary || 'DevCompare snapshot',
      url: `${BASE_URL}/${entry.url}`,
      nav: navArticles,
      content: contentHtml,
      ogTitle: `${entry.title} · DevCompare`,
      ogDescription: entry.metaDescription || entry.summary || entry.description,
      ogUrl: `${BASE_URL}/${entry.url}`,
      ogType: 'article',
      canonical: `${BASE_URL}/${entry.url}`,
      publishedDate: entry.publishedDate,
      updatedDate: entry.lastUpdated
    });
    await fs.promises.mkdir(path.dirname(entryPath), { recursive: true });
    await fs.promises.writeFile(entryPath, articleHtml);
  }
}

async function build(newPages = []) {
  if (!fs.existsSync(PAGES_PATH)) {
    throw new Error('No generated pages metadata found. Run the pipeline first.');
  }

  const templates = {
    pageTemplate: readTemplate('page.html'),
    homeTemplate: readTemplate('home.html'),
    rssTemplate: readTemplate('rss.xml'),
    sitemapTemplate: readTemplate('sitemap.xml'),
    robotsTemplate: readTemplate('robots.txt')
  };

  const rawPages = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
  const allPages = Array.isArray(rawPages)
    ? rawPages.filter((page) => page && page.url && page.markdownPath)
    : [];
  const sortedPages = allPages.sort(
    (a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)
  );

  const md = new MarkdownIt({ html: true });
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.promises.mkdir(path.join(OUTPUT_DIR, PAGE_SUBDIR), { recursive: true });

  const navRoot = renderNav('');
  const navArticles = renderNav('../');

  const heroSection = `
    <section class="hero">
      <p class="eyebrow">Persistent archives · Chronological SEO</p>
      <h1>DevCompare</h1>
      <p>Automated DevCompare releases are preserved with dated filenames, JSON-LD, and AI-friendly summaries.</p>
      <div class="hero-actions">
        <a class="primary" href="latest.html">View latest archival snapshots</a>
        <a href="archive.html">Browse the archive</a>
      </div>
    </section>
  `;
  const featuredCards = sortedPages.slice(0, 6).map(renderCard).join('');
  const homeContent = `
    ${heroSection}
    <section class="grid">
      ${featuredCards}
    </section>
  `;
  const homeHtml = applyTemplate(templates.homeTemplate, {
    title: 'DevCompare · Persistent AI research platform',
    description:
      'Automated, date-stamped developer tool comparisons and directories curated for AI search assistants.',
    url: `${BASE_URL}/index.html`,
    nav: navRoot,
    content: homeContent,
    ogTitle: 'DevCompare content archive',
    ogDescription: 'Date-based snapshots and SEO-friendly narratives for developer tools.',
    ogUrl: `${BASE_URL}/index.html`,
    ogType: 'website',
    canonical: `${BASE_URL}/index.html`
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'index.html'), homeHtml);

  const latestSection = `
    <section class="section-heading">
      <h1>Latest snapshots</h1>
      <p>Chronological log of archived briefs generated by the pipeline.</p>
    </section>
    <section class="grid">
      ${sortedPages.slice(0, 12).map(renderCard).join('')}
    </section>
  `;
  const latestHtml = applyTemplate(templates.pageTemplate, {
    title: 'Latest DevCompare snapshots',
    description:
      'Fresh DevCompare briefs preserved with visible timestamps, JSON-LD, and SEO-ready details.',
    url: `${BASE_URL}/latest.html`,
    nav: navRoot,
    content: latestSection,
    ogTitle: 'Latest DevCompare snapshots',
    ogDescription: 'Newest generator output saved inside /pages with human and machine summaries.',
    ogUrl: `${BASE_URL}/latest.html`,
    ogType: 'website',
    canonical: `${BASE_URL}/latest.html`
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'latest.html'), latestHtml);

  const aboutContent = `
    <section class="section-heading">
      <h1>About DevCompare</h1>
      <p>DevCompare is an autonomous content engine focused on developer tools comparisons, directories, and release notes.</p>
      <p>Every pipeline run preserves content with dated filenames, archival metadata, and JSON-LD to maximize SEO and AI search compatibility.</p>
      <ul>
        <li>Date-based filenames ensure stability and historical context.</li>
        <li>Category directories and archive routes keep data discoverable.</li>
        <li>Nav, cards, and metadata stay lightweight for GitHub Pages deployments.</li>
      </ul>
    </section>
  `;
  const aboutHtml = applyTemplate(templates.pageTemplate, {
    title: 'About DevCompare',
    description: 'Learn how DevCompare archives developer tool research for AI search.',
    url: `${BASE_URL}/about.html`,
    nav: navRoot,
    content: aboutContent,
    ogTitle: 'About DevCompare',
    ogDescription: 'How DevCompare preserves dated content for SEO and AI search.',
    ogUrl: `${BASE_URL}/about.html`,
    ogType: 'website',
    canonical: `${BASE_URL}/about.html`
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'about.html'), aboutHtml);

  const categoriesCards = CATEGORIES.map((category) => {
    const alias = CATEGORY_ALIASES[category.slug];
    const suffix = alias ? `category-${alias}.html` : `category-${category.slug}.html`;
    return `
      <article class="card">
        <h3><a href="category-${category.slug}.html">${category.name}</a></h3>
        <p>${category.description}</p>
        <p class="highlights">Typical tools: ${category.typicalTools.join(', ')}</p>
        <div class="chip-row">
          <a class="chip" href="category-${category.slug}.html">Explore</a>
          ${alias ? `<a class="chip" href="${suffix}">Alias</a>` : ''}
        </div>
      </article>
    `;
  }).join('');
  const categoriesContent = `
    <section class="section-heading">
      <h1>Category directories</h1>
      <p>Each category page lists tools, comparisons, and weekly releases sorted by date.</p>
    </section>
    <section class="grid">
      ${categoriesCards}
    </section>
  `;
  const categoriesHtml = applyTemplate(templates.pageTemplate, {
    title: 'Categories · DevCompare',
    description: 'Browse DevCompare category directories with chronological listings.',
    url: `${BASE_URL}/categories.html`,
    nav: navRoot,
    content: categoriesContent,
    ogTitle: 'DevCompare categories',
    ogDescription: 'Structured directories for every category of developer tooling.',
    ogUrl: `${BASE_URL}/categories.html`,
    ogType: 'website',
    canonical: `${BASE_URL}/categories.html`
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'categories.html'), categoriesHtml);

  for (const category of CATEGORIES) {
    const categoryContent = `
      <section class="section-heading">
        <h1>${category.name} directory</h1>
        <p>${category.description}</p>
      </section>
      ${renderCategorySections(category, sortedPages)}
    `;
    const categoryHtml = applyTemplate(templates.pageTemplate, {
      title: `${category.name} tools · DevCompare`,
      description: `Chronological directory of ${category.name} tooling.`,
      url: `${BASE_URL}/category-${category.slug}.html`,
      nav: navRoot,
      content: categoryContent,
      ogTitle: `${category.name} directory · DevCompare`,
      ogDescription: `Find ${category.name} tool picks, comparisons, and releases.`,
      ogUrl: `${BASE_URL}/category-${category.slug}.html`,
      ogType: 'website',
      canonical: `${BASE_URL}/category-${category.slug}.html`
    });
    await fs.promises.writeFile(
      path.join(OUTPUT_DIR, `category-${category.slug}.html`),
      categoryHtml
    );

    const alias = CATEGORY_ALIASES[category.slug];
    if (alias) {
      await fs.promises.writeFile(
        path.join(OUTPUT_DIR, `category-${alias}.html`),
        categoryHtml
      );
    }
  }

  const years = Array.from(
    new Set(sortedPages.map((entry) => new Date(entry.publishedDate).getFullYear()))
  ).sort((a, b) => b - a);
  const archiveSections = years.map((year) => renderArchiveSection(year, sortedPages)).join('');
  const archiveContent = `
    <section class="section-heading">
      <h1>Archive</h1>
      <p>Every snapshot sorted by date and category.</p>
    </section>
    ${archiveSections}
  `;
  const archiveHtml = applyTemplate(templates.pageTemplate, {
    title: 'Archive · DevCompare',
    description: 'Date-driven archive of DevCompare snapshots.',
    url: `${BASE_URL}/archive.html`,
    nav: navRoot,
    content: archiveContent,
    ogTitle: 'DevCompare archive',
    ogDescription: 'Monthly and yearly snapshots with strong SEO markup.',
    ogUrl: `${BASE_URL}/archive.html`,
    ogType: 'website',
    canonical: `${BASE_URL}/archive.html`
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'archive.html'), archiveHtml);

  for (const year of years) {
    const yearContent = `
      <section class="section-heading">
        <h1>Archive ${year}</h1>
        <p>Chronological listing for ${year}.</p>
      </section>
      ${renderArchiveSection(year, sortedPages)}
    `;
    const yearHtml = applyTemplate(templates.pageTemplate, {
      title: `Archive ${year} · DevCompare`,
      description: `Archived snapshots published in ${year}.`,
      url: `${BASE_URL}/archive-${year}.html`,
      nav: navRoot,
      content: yearContent,
      ogTitle: `DevCompare archive ${year}`,
      ogDescription: `Chronological list of snapshots from ${year}.`,
      ogUrl: `${BASE_URL}/archive-${year}.html`,
      ogType: 'website',
      canonical: `${BASE_URL}/archive-${year}.html`
    });
    await fs.promises.writeFile(path.join(OUTPUT_DIR, `archive-${year}.html`), yearHtml);
  }

  const rssItems = sortedPages
    .map((entry) => {
      return `
        <item>
          <title>${entry.title}</title>
          <link>${BASE_URL}/${entry.url}</link>
          <description>${entry.description}</description>
          <pubDate>${new Date(entry.publishedDate).toUTCString()}</pubDate>
        </item>
      `;
    })
    .join('');
  const rssXml = applyTemplate(templates.rssTemplate, {
    baseUrl: BASE_URL,
    items: rssItems
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'rss.xml'), rssXml);

  const sitemapItems = sortedPages
    .map((entry) => {
      return `
        <url>
          <loc>${BASE_URL}/${entry.url}</loc>
          <lastmod>${entry.lastUpdated}</lastmod>
        </url>
      `;
    })
    .join('');
  const sitemapXml = applyTemplate(templates.sitemapTemplate, {
    items: sitemapItems
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapXml);

  const robots = applyTemplate(templates.robotsTemplate, {
    baseUrl: BASE_URL
  });
  await fs.promises.writeFile(path.join(OUTPUT_DIR, 'robots.txt'), robots);

  await buildArticles(allPages, templates, navArticles, md);
}

module.exports = build;
