const fs = require('fs');
const path = require('path');

const AFFILIATE_MAP = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'affiliate.json'), 'utf8')
);
const CATEGORIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'categories.json'), 'utf8')
);

const GENERATED_PATH = path.join(__dirname, '..', 'data', 'generated', 'pages.json');
const MARKDOWN_DIR = path.join(__dirname, '..', 'data', 'generated', 'markdown');
const BASE_URL = 'https://onlythejoe.github.io/DevCompare';

const FALLBACK_TOOLS = [
  {
    name: 'Visual Studio Code',
    slug: 'visual-studio-code',
    description:
      'Universal editor with extensions for everything from remote debugging to AI pair programming.',
    summary: 'Feature-rich editor with integrations to help developers ship code fast.',
    link: 'https://code.visualstudio.com/',
    source: 'Fallback',
    isoDate: new Date().toISOString(),
    keywords: ['editor', 'extensions', 'debugging'],
    useCases: ['remote debugging', 'multi-lang projects'],
    pros: ['Great for remote debugging', 'Extensions-ready automation'],
    cons: ['Overkill for micro prototypes'],
    pricing: 'Free with paid Codespaces add-ons'
  },
  {
    name: 'Figma Dev Mode',
    slug: 'figma-dev-mode',
    description: 'Design-to-code workspace that surfaces specs directly to engineers.',
    summary: 'Bridges design handoff with annotated specs for dev teams.',
    link: 'https://www.figma.com/',
    source: 'Fallback',
    isoDate: new Date().toISOString(),
    keywords: ['design', 'handoffs', 'ui'],
    useCases: ['UI handoff', 'component specs'],
    pros: ['Smooth for UI contracts', 'Strong collaboration coverage'],
    cons: ['Needs extra setup for React ecosystems'],
    pricing: 'Free tier plus team plans'
  }
];

const categoryIndex = CATEGORIES.reduce((map, category) => {
  map.set(category.slug, category);
  return map;
}, new Map());

function normalizeTitle(title = '') {
  return title
    .replace(/\s+/g, ' ')
    .replace(/\s+:\s+/g, ': ')
    .replace(/\s+vs\s+/gi, ' vs. ')
    .trim();
}

function pickAffiliate(toolName) {
  const normalized = toolName.toLowerCase();
  for (const [keyword, url] of Object.entries(AFFILIATE_MAP)) {
    if (normalized.includes(keyword.toLowerCase())) {
      return url;
    }
  }
  return null;
}

function splitSentences(text = '') {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text = '', maxSentences = 2) {
  const sentences = splitSentences(text);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    chunks.push(sentences.slice(i, i + maxSentences).join(' '));
  }
  const trimmed = chunks.length ? chunks : [text];
  return trimmed.map((chunk) => chunk.trim()).filter(Boolean);
}

function pickHighlights(text = '', keywords = [], count = 2) {
  const keywordSet = new Set(keywords.map((word) => word.toLowerCase()));
  const scored = splitSentences(text).map((sentence, index) => {
    const words = sentence.toLowerCase().split(/\W+/).filter(Boolean);
    const matches = words.filter((word) => keywordSet.has(word)).length;
    const score = matches * 2 + Math.min(sentence.length / 80, 2) - index * 0.1;
    return { sentence, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.sentence);
}

function buildTagList(tags = []) {
  if (!tags.length) {
    return '<p class="muted">Tags pending enrichment.</p>';
  }
  const pills = tags.map((tag) => `<span class="pill">${tag}</span>`).join('');
  return `<div class="tag-list">${pills}</div>`;
}

function renderComparisonTable(tools = []) {
  if (tools.length < 2) {
    return '';
  }
  const rows = tools
    .map((tool) => {
      const useCases = tool.useCases && tool.useCases.length ? tool.useCases.join(', ') : 'General workflows';
      return `
        <tr>
          <td><a href="${tool.link || '#'}">${tool.name}</a></td>
          <td>${tool.pricing || 'Pricing varies'}</td>
          <td>${useCases}</td>
          <td>${tool.source || 'Vendor'}</td>
        </tr>
      `;
    })
    .join('');

  return `
<section class="section-block">
  <h2>Tool comparison</h2>
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Tool</th>
        <th>Pricing</th>
        <th>Primary use cases</th>
        <th>Source</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</section>
  `;
}

function buildFactSheet(page, tools) {
  const mentions = tools.reduce((sum, tool) => sum + (tool.mentions || 0), 0);
  const sources = Array.from(new Set(tools.map((tool) => tool.source).filter(Boolean)));
  const toolNames = tools.map((tool) => tool.name);
  const topics = Array.from(
    new Set(
      tools
        .flatMap((tool) => tool.keywords || [])
        .map((keyword) => keyword.toLowerCase())
    )
  ).slice(0, 8);

  return `
<section class="section-block">
  <h2>Fact sheet</h2>
  <div class="fact-grid">
    <div><strong>Snapshots</strong><span>${tools.length} tools</span></div>
    <div><strong>Mentions</strong><span>${mentions || tools.length}</span></div>
    <div><strong>Sources</strong><span>${sources.length || 'Multiple'}</span></div>
    <div><strong>Topics</strong><span>${topics.join(', ') || 'General tooling'}</span></div>
    <div><strong>Entities</strong><span>${toolNames.join(', ')}</span></div>
    <div><strong>Coverage</strong><span>${page.focus}</span></div>
  </div>
</section>
  `;
}

function buildEditorialSections(page, tools) {
  const descriptions = tools.map((tool) => tool.description).filter(Boolean).join(' ');
  const contextParagraphs = splitParagraphs([page.description, descriptions].join(' '), 2);
  const featureSignals = Array.from(
    new Set(
      tools
        .flatMap((tool) => tool.keywords || [])
        .map((keyword) => keyword.replace(/-/g, ' '))
    )
  ).slice(0, 8);
  const useCases = Array.from(
    new Set(tools.flatMap((tool) => tool.useCases || []))
  ).slice(0, 6);
  const limits = Array.from(
    new Set(tools.flatMap((tool) => tool.cons || []))
  ).slice(0, 6);

  const featureList = featureSignals.length
    ? `<ul>${featureSignals.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '<p class="muted">Feature signals will expand as more sources publish.</p>';
  const useCaseList = useCases.length
    ? `<ul>${useCases.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '<p class="muted">Use-case details pending new releases.</p>';
  const limitsList = limits.length
    ? `<ul>${limits.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '<p class="muted">Limits will expand as sources report constraints.</p>';

  return `
<section class="section-block">
  <h2>Context</h2>
  ${
    contextParagraphs.length
      ? contextParagraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')
      : '<p class="muted">Context will expand as new sources land.</p>'
  }
</section>
<section class="section-block">
  <h2>Features</h2>
  ${featureList}
</section>
<section class="section-block">
  <h2>Use cases</h2>
  ${useCaseList}
</section>
<section class="section-block">
  <h2>Limits</h2>
  ${limitsList}
</section>
  `;
}

function buildHighlightsBlock(text, keywords) {
  const highlights = pickHighlights(text, keywords, 3);
  if (!highlights.length) {
    return '';
  }
  const items = highlights.map((sentence) => `<li>${sentence}</li>`).join('');
  return `
<div class="callout">
  <strong>Key sentences</strong>
  <ul>${items}</ul>
</div>
  `;
}

function buildMetaDescription(page, tools) {
  const toolNames = tools.slice(0, 3).map((tool) => tool.name).join(', ');
  const base = `${page.description} Highlights include ${toolNames}. ${page.summary}`;
  return base.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function renderToolSection(tool) {
  const affiliate = pickAffiliate(tool.name);
  const toolTitle = affiliate
    ? `### [${tool.name}](${affiliate})`
    : `### ${tool.name}`;
  const description = tool.description || tool.summary || 'Tool description pending.';
  const descriptionParagraphs = splitParagraphs(description, 2);
  const useCases = tool.useCases && tool.useCases.length
    ? ['- **Use cases**:', ...tool.useCases.map((useCase) => `  - ${useCase}`)].join('\n')
    : '- **Use cases**: general developer workflows';
  const pros = tool.pros && tool.pros.length
    ? ['- **Pros**:', ...tool.pros.map((pro) => `  - ${pro}`)].join('\n')
    : '- **Pros**: stay tuned for vendor updates';
  const cons = tool.cons && tool.cons.length
    ? ['- **Cons**:', ...tool.cons.map((con) => `  - ${con}`)].join('\n')
    : '- **Cons**: check implementation effort';

  const highlights = buildHighlightsBlock(
    [tool.summary, tool.description].filter(Boolean).join(' '),
    tool.keywords || []
  );
  const keywordTags = buildTagList((tool.keywords || []).slice(0, 8));

  return [
    '<section class="tool-section">',
    toolTitle,
    ...descriptionParagraphs,
    highlights,
    '<div class="tool-meta">',
    `- **Source**: [${tool.source || 'link provided'}](${tool.link || '#'})`,
    `- **Pricing**: ${tool.pricing || 'Pricing varies; vendor sites have details'}`,
    useCases,
    pros,
    cons,
    affiliate ? `- **Affiliate**: [Redeem offer](${affiliate})` : '',
    '</div>',
    '<div class="tag-block">',
    '<strong>Keywords</strong>',
    keywordTags,
    '</div>',
    '</section>',
    ''
  ].join('\n');
}

function renderFAQ() {
  const faqs = [
    {
      q: 'How often does DevCompare refresh this page?',
      a: 'Daily automation pipelines fetch RSS updates, snapshot the context, and publish a new dated summary.'
    },
    {
      q: 'Can I get notified when new comparisons publish?',
      a: 'Subscribe to the RSS feed at rss.xml or follow the GitHub Pages release history.'
    },
    {
      q: 'Where do affiliate links point?',
      a: 'Every affiliate link resolves to vetted partners from config/affiliate.json.'
    },
    {
      q: 'How are archives and categories maintained?',
      a: 'Every pipeline run archives dated reports, assigns them to categories, and keeps the history intact.'
    }
  ];

  return {
    markdown: ['## FAQ', ...faqs.map((faq) => `- **${faq.q}** ${faq.a}`)].join('\n'),
    schema: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a
      }
    }))
  };
}

function buildJsonLd(page, tools, faqSchema) {
  const canonical = `${BASE_URL}/${page.url}`;
  const articleSection = page.categories.map((category) => category.name);
  const keywords = Array.from(
    new Set([
      ...articleSection,
      ...tools.flatMap((tool) => tool.keywords || [])
    ])
  );

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    url: canonical,
    name: page.title,
    description: page.description,
    datePublished: page.publishedDate,
    dateModified: page.lastUpdated,
    author: {
      '@type': 'Organization',
      name: 'DevCompare'
    },
    about: tools.slice(0, 3).map((tool) => ({
      '@type': 'Thing',
      name: tool.name,
      url: tool.link
    })),
    articleSection,
    keywords: keywords.join(', ')
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqSchema
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'DevCompare',
        item: `${BASE_URL}/index.html`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: page.title,
        item: canonical
      }
    ]
  };

  const products = tools.slice(0, 4).map((tool) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: tool.name,
    description: tool.description,
    url: tool.link,
    brand: {
      '@type': 'Thing',
      name: tool.source || 'Unknown'
    },
    offers: {
      '@type': 'Offer',
      description: tool.pricing,
      url: tool.link
    }
  }));

  return JSON.stringify([article, faqPage, breadcrumb, ...products], null, 2);
}

function buildMachineSummary(page, tools) {
  const highlights = tools.slice(0, 3).map((tool) => tool.name);
  return [
    '## Machine Summary',
    '',
    `- **Focus**: ${page.focus}`,
    `- **Highlights**: ${highlights.join(', ')}`,
    `- **Synopsis**: ${page.summary}`,
    `- **Published**: ${page.visibleDate}`,
    `- **Updated**: ${page.visibleDate}`
  ].join('\n');
}

function buildKeyFacts(page) {
  const categories = page.categories.length
    ? page.categories.map((category) => category.name).join(', ')
    : 'General developer tools';
  const foughtTools = page.toolHighlights.length ? page.toolHighlights.join(', ') : 'Varied tools';

  return `
<section class="section-block key-facts">
  <h2>Key facts</h2>
  <ul>
    <li><strong>Categories</strong>: ${categories}</li>
    <li><strong>Spotlight tools</strong>: ${foughtTools}</li>
    <li><strong>Focus area</strong>: ${page.focus}</li>
    <li><strong>Summary</strong>: ${page.summary}</li>
    <li><strong>Chronology</strong>: Published ${page.visibleDate}, archived with automated records</li>
  </ul>
</section>
  `;
}

function buildPageMarkdown(page, tools) {
  const faq = renderFAQ();
  const jsonld = `
<script type="application/ld+json">
${buildJsonLd(page, tools, faq.schema)}
</script>
`;
  const keywordTags = buildTagList(
    Array.from(
      new Set([
        ...page.categories.map((category) => category.name.toLowerCase()),
        ...tools.flatMap((tool) => tool.keywords || [])
      ])
    ).slice(0, 12)
  );
  let introParagraphs = splitParagraphs(page.description, 2);
  if (!introParagraphs.length) {
    introParagraphs = [page.summary || 'Snapshot summary pending.'];
  }
  const shouldCompare = page.type === 'comparison' || /vs\./i.test(page.title);
  return [
    `# ${page.title}`,
    `> Published: ${page.visibleDate}`,
    `> Updated: ${page.visibleDate}`,
    buildMachineSummary(page, tools),
    '## Brief',
    ...introParagraphs,
    buildHighlightsBlock(page.summary, tools.flatMap((tool) => tool.keywords || [])),
    buildKeyFacts(page),
    buildFactSheet(page, tools),
    '<section class="section-block">',
    '<h2>Keywords & tags</h2>',
    keywordTags,
    '</section>',
    buildEditorialSections(page, tools),
    shouldCompare ? renderComparisonTable(tools) : '',
    ...tools.map((tool) => renderToolSection(tool)),
    `> Summary: ${page.summary}`,
    '## Summary Block',
    `- **Last updated**: ${page.visibleDate}`,
    `- **Focus**: ${page.focus}`,
    '## Concluding Thoughts',
    page.conclusion,
    faq.markdown,
    jsonld
  ].join('\n\n');
}

function enrichTools(tools) {
  return tools.map((tool) => ({
    ...tool,
    affiliate: pickAffiliate(tool.name)
  }));
}

function sortTools(tools) {
  return tools
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.isoDate || a.date || Date.now());
      const dateB = new Date(b.isoDate || b.date || Date.now());
      return dateB - dateA;
    });
}

function pickToolsForPage(tools, count = 4) {
  const sorted = sortTools(tools);
  return sorted.slice(0, count);
}

function formatHumanDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function matchCategoriesForPage(tools) {
  const matched = new Map();
  for (const tool of tools) {
    const keywords = (tool.keywords || []).map((keyword) => keyword.toLowerCase());
    for (const category of CATEGORIES) {
      const matches = category.keywords.some((keyword) =>
        keywords.some((toolKey) => toolKey.includes(keyword.toLowerCase()))
      );
      if (matches) {
        matched.set(category.slug, category);
      }
    }
  }
  return Array.from(matched.values()).map((category) => ({
    slug: category.slug,
    name: category.name
  }));
}

async function loadExistingCatalog() {
  if (!fs.existsSync(GENERATED_PATH)) {
    return [];
  }
  try {
    const raw = await fs.promises.readFile(GENERATED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry) => entry && entry.url && entry.markdownPath);
  } catch (error) {
    return [];
  }
}

async function generateContent(tools = []) {
  const snapshot = tools.length ? enrichTools(tools) : FALLBACK_TOOLS;
  const now = new Date();
  const isoDate = now.toISOString();
  const dateTag = isoDate.slice(0, 10);
  const timeTag = isoDate.slice(11, 23).replace(/[:.]/g, '');
  const runTag = `${dateTag}-${timeTag}`;

  const pageDefinitions = [
    {
      slug: 'best-dev-tools-for-productivity',
      title: 'Best Developer Tools for Productivity Workflows',
      type: 'best-tools',
      focus: 'Productivity & Automation',
      description: 'Daily curated picks for developer tools that accelerate workflows.',
      summary: 'Productivity stacks that keep developer teams in sync.',
      conclusion: 'Pick tools that map to your delivery rhythm and instrument the workflows with APIs.',
      tools: pickToolsForPage(snapshot, 5)
    },
    {
      slug: 'top-software-for-remote-debugging',
      title: 'Top Software for Remote Debugging and Observability',
      type: 'top-software',
      focus: 'Debugging & Observability',
      description: 'The most cited tools for tracing, remote debugging, and incident analysis.',
      summary: 'Reliable remote debugging minimizes downtime and cognitive load.',
      conclusion: 'Combine teleportation-like tooling with rich traces to spot regressions sooner.',
      tools: pickToolsForPage(snapshot, 4)
    },
    {
      slug: 'gitpod-vscode-comparison',
      title: 'Gitpod vs VS Code: Browser IDE vs Desktop Power',
      type: 'comparison',
      focus: 'IDE Experience',
      description: 'Compare the browser-first Gitpod workspaces with the desktop Visual Studio Code experience.',
      summary: 'Gitpod brings zero-config workspaces while VS Code offers fine-grained extensions.',
      conclusion: 'Use Gitpod when environment parity matters and VS Code when hardware access is critical.',
      tools: pickToolsForPage(snapshot, 2)
    },
    {
      slug: 'new-collections-this-week',
      title: 'New Tools This Week: Fresh Releases in Dev Productivity',
      type: 'weekly-roundup',
      focus: 'Fresh Releases',
      description: 'Summaries of the newest developer tools pulled from developer feeds.',
      summary: 'New launches that are shipping with automation-friendly APIs.',
      conclusion: 'Bookmark this page and refresh the RSS for the latest releases.',
      tools: pickToolsForPage(snapshot, 3)
    }
  ];

  await fs.promises.mkdir(MARKDOWN_DIR, { recursive: true });

  const newEntries = [];
  for (const page of pageDefinitions) {
    const enrichedTools = page.tools.length ? page.tools : snapshot.slice(0, 3);
    const fileKey = `${runTag}-${page.slug}`;
    const htmlFilename = `${fileKey}.html`;
    const markdownFilename = `${fileKey}.md`;
    const markdownPath = path.join(MARKDOWN_DIR, markdownFilename);
    const categories = matchCategoriesForPage(enrichedTools);
    const toolHighlights = enrichedTools.slice(0, 3).map((tool) => tool.name);
    const normalizedTitle = normalizeTitle(page.title);
    const pageMetadata = {
      slug: page.slug,
      title: normalizedTitle,
      type: page.type,
      focus: page.focus,
      description: page.description,
      summary: page.summary,
      conclusion: page.conclusion,
      publishedDate: isoDate,
      lastUpdated: isoDate,
      visibleDate: formatHumanDate(isoDate),
      url: `pages/${htmlFilename}`,
      markdownPath: path.relative(path.join(__dirname, '..'), markdownPath).replace(/\\/g, '/'),
      categories,
      toolHighlights,
      metaDescription: buildMetaDescription(page, enrichedTools),
      tools: enrichedTools
    };

    const markdown = buildPageMarkdown(pageMetadata, enrichedTools);
    await fs.promises.writeFile(markdownPath, markdown);

    newEntries.push(pageMetadata);
  }

  const existingCatalog = await loadExistingCatalog();
  const aggregated = [...existingCatalog, ...newEntries].sort(
    (a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)
  );

  await fs.promises.mkdir(path.dirname(GENERATED_PATH), { recursive: true });
  await fs.promises.writeFile(GENERATED_PATH, JSON.stringify(aggregated, null, 2));

  return newEntries;
}

module.exports = generateContent;
