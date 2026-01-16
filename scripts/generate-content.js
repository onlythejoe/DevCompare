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

function pickAffiliate(toolName) {
  const normalized = toolName.toLowerCase();
  for (const [keyword, url] of Object.entries(AFFILIATE_MAP)) {
    if (normalized.includes(keyword.toLowerCase())) {
      return url;
    }
  }
  return null;
}

function renderToolSection(tool) {
  const affiliate = pickAffiliate(tool.name);
  const toolTitle = affiliate
    ? `### [${tool.name}](${affiliate})`
    : `### ${tool.name}`;
  const description = tool.description || tool.summary || 'Tool description pending.';
  const useCases = tool.useCases && tool.useCases.length
    ? ['- **Use cases**:', ...tool.useCases.map((useCase) => `  - ${useCase}`)].join('\n')
    : '- **Use cases**: general developer workflows';
  const pros = tool.pros && tool.pros.length
    ? ['- **Pros**:', ...tool.pros.map((pro) => `  - ${pro}`)].join('\n')
    : '- **Pros**: stay tuned for vendor updates';
  const cons = tool.cons && tool.cons.length
    ? ['- **Cons**:', ...tool.cons.map((con) => `  - ${con}`)].join('\n')
    : '- **Cons**: check implementation effort';

  return [
    toolTitle,
    description,
    `- **Source**: [${tool.source || 'link provided'}](${tool.link || '#'})`,
    `- **Pricing**: ${tool.pricing || 'Pricing varies; vendor sites have details'}`,
    useCases,
    pros,
    cons,
    affiliate ? `- **Affiliate**: [Redeem offer](${affiliate})` : '',
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
    articleSection
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqSchema
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

  return JSON.stringify([article, faqPage, ...products], null, 2);
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

  return [
    '## Key Facts',
    '',
    `- **Categories**: ${categories}`,
    `- **Spotlight tools**: ${foughtTools}`,
    `- **Focus area**: ${page.focus}`,
    `- **Summary**: ${page.summary}`,
    `- **Chronology**: Published ${page.visibleDate}, archived with automated records`
  ].join('\n');
}

function buildPageMarkdown(page, tools) {
  const faq = renderFAQ();
  const jsonld = `
<script type="application/ld+json">
${buildJsonLd(page, tools, faq.schema)}
</script>
`;
  return [
    `# ${page.title}`,
    `> Published: ${page.visibleDate}`,
    `> Updated: ${page.visibleDate}`,
    buildMachineSummary(page, tools),
    '## Brief',
    page.description,
    buildKeyFacts(page),
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
    const pageMetadata = {
      slug: page.slug,
      title: page.title,
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
      metaDescription: page.description,
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
