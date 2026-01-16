const fs = require('fs');
const path = require('path');

const AFFILIATE_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'affiliate.json'), 'utf8'));
const CATEGORIES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'categories.json'), 'utf8'));

const GENERATED_PATH = path.join(__dirname, '..', 'data', 'generated', 'pages.json');

const BASE_URL = 'https://devcompare.github.io';

const FALLBACK_TOOLS = [
  {
    name: 'Visual Studio Code',
    slug: 'visual-studio-code',
    description: 'Universal editor with extensions for everything from remote debugging to AI pair programming.',
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

function pickAffiliate(toolName) {
  const normalized = toolName.toLowerCase();
  for (const [keyword, url] of Object.entries(AFFILIATE_MAP)) {
    if (normalized.includes(keyword.toLowerCase())) {
      return url;
    }
  }
  return null;
}

function toolSection(tool) {
  const affiliate = pickAffiliate(tool.name);
  const toolTitle = affiliate ? `### [${tool.name}](${affiliate})` : `### ${tool.name}`;
  const description = tool.description || tool.summary || 'Tool description pending.';
  const useCases = tool.useCases.length
    ? ['- **Use cases**:', ...tool.useCases.map((useCase) => `  - ${useCase}`)].join('\n')
    : '- **Use cases**: general developer workflows';
  const pros = tool.pros.length
    ? ['- **Pros**:', ...tool.pros.map((pro) => `  - ${pro}`)].join('\n')
    : '- **Pros**: see vendor updates';
  const cons = tool.cons.length
    ? ['- **Cons**:', ...tool.cons.map((con) => `  - ${con}`)].join('\n')
    : '- **Cons**: check for implementation effort';

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
      a: 'Daily automation pipelines fetch RSS updates and regenerate content so tables stay current.'
    },
    {
      q: 'Can I get notified when new comparisons publish?',
      a: 'Subscribe to the RSS feed at /rss.xml or use GitHub Pages deployment notifications.'
    },
    {
      q: 'Where do affiliate links point?',
      a: 'Every affiliate link resolves to vetted partners configured in config/affiliate.json.'
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
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    name: page.title,
    url: `${BASE_URL}/${page.slug}.html`,
    headline: page.title,
    description: page.description,
    datePublished: page.date,
    author: {
      '@type': 'Organization',
      name: 'DevCompare'
    },
    about: tools.slice(0, 3).map((tool) => ({
      '@type': 'Thing',
      name: tool.name,
      url: tool.link
    }))
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
  const topToolNames = tools.slice(0, 3).map((tool) => tool.name);
  return [
    '## Machine Summary',
    '',
    `- **Focus**: ${page.focus}`,
    `- **Highlights**: ${topToolNames.join(', ')}`,
    `- **Synopsis**: ${page.summary}`,
    `- **Updated**: ${page.date}`
  ].join('\n');
}

function buildPageMarkdown(page, tools) {
  const machineSummary = buildMachineSummary(page, tools);
  const briefIntro = page.description;
  const toolBlocks = tools.map(toolSection).join('\n\n');
  const summary = `> Summary: ${page.summary}`;
  const faq = renderFAQ();
  const jsonld = `
<script type="application/ld+json">
${buildJsonLd(page, tools, faq.schema)}
</script>
`;

  return [
    `# ${page.title}`,
    machineSummary,
    '## Brief',
    briefIntro,
    toolBlocks,
    summary,
    faq.markdown,
    '## Summary Block',
    `- **Last updated**: ${page.date}`,
    `- **Focus**: ${page.focus}`,
    '## Concluding Thoughts',
    page.conclusion,
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
async function generateContent(tools = []) {
  const snapshot = tools.length ? enrichTools(tools) : FALLBACK_TOOLS;
  const now = new Date().toISOString();
  const pageDefinitions = [
    {
      slug: 'best-dev-tools-for-productivity',
      title: 'Best Developer Tools for Productivity Workflows',
      type: 'best-tools',
      focus: 'Productivity & Automation',
      description: 'Daily curated picks for developer tools that accelerate workflows.',
      summary: 'Productivity stacks that keep developer teams in sync.',
      conclusion: 'Pick tools that map to your delivery rhythm and instrument the workflows with APIs.' ,
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

  const directoryPages = CATEGORIES.map((category) => ({
    slug: `directory-${category.slug}`,
    title: `${category.name} Tool Directory`,
    type: 'category-directory',
    focus: category.description,
    description: `Structured directory of ${category.name} tooling for AI assistants and search agents.`,
    summary: `Organized facts on ${category.name} tools and their use cases.`,
    conclusion: 'Use the directory to feed prompt templates or AI shopping carts.',
    tools: snapshot.filter((tool) =>
      category.keywords.some((keyword) => tool.keywords.some((toolKey) => toolKey.toLowerCase().includes(keyword.toLowerCase())))
    )
  }));

  const pages = [...pageDefinitions, ...directoryPages].map((page) => ({
    ...page,
    tools: page.tools.length ? page.tools : snapshot.slice(0, 3),
    date: now
  }));

  await fs.promises.mkdir(path.join(__dirname, '..', 'content'), { recursive: true });

  const catalog = [];
  for (const page of pages) {
    const markdown = buildPageMarkdown(page, page.tools);
    const filePath = path.join(__dirname, '..', 'content', `${page.slug}.md`);
    await fs.promises.writeFile(filePath, markdown);
    catalog.push({
      slug: page.slug,
      title: page.title,
      type: page.type,
      focus: page.focus,
      date: page.date,
      description: page.description
    });
  }

  await fs.promises.mkdir(path.dirname(GENERATED_PATH), { recursive: true });
  await fs.promises.writeFile(GENERATED_PATH, JSON.stringify(catalog, null, 2));

  return catalog;
}

module.exports = generateContent;
