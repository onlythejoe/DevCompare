const fs = require('fs');
const path = require('path');

const STOP_WORDS = new Set([
  'the','and','that','this','with','from','are','for','not','but','have','has','will','its','which','into','using','more','can','about','when','while','also'
]);

const PRO_CON_TEMPLATES = {
  pros: ['Great for %s', '%s-ready automation', 'Strong %s coverage'],
  cons: ['Overkill for %s experiments', 'Needs extra setup for %s workflows', 'Not optimized for %s at scale']
};

const PROCESSED_PATH = path.join(__dirname, '..', 'data', 'processed', 'tools.json');

function cleanText(text = '') {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

function topTokens(text, limit = 4) {
  const freq = {};
  tokenize(text).forEach((word) => {
    freq[word] = (freq[word] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function pickSentences(text, count = 2) {
  const sentences = text
    .split(/(?<=[.?\n])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);

  const scored = sentences.map((sentence) => {
    const words = tokenize(sentence);
    const score = words.reduce((sum, word) => sum + 1, 0);
    return { sentence, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.sentence);
}

function deriveName(title) {
  const separators = [' - ', ' — ', ':', '|'];
  for (const sep of separators) {
    if (title.includes(sep)) {
      return title.split(sep)[0].trim();
    }
  }
  const words = title.split(' ');
  return words.slice(0, 3).join(' ').trim();
}

function createProCon(keywordList, kind) {
  const sentences = [];
  const templateList = PRO_CON_TEMPLATES[kind];
  keywordList.slice(0, 2).forEach((keyword, index) => {
    const template = templateList[index % templateList.length];
    sentences.push(template.replace('%s', keyword));
  });
  return sentences;
}

function detectPricing(text) {
  const lowered = text.toLowerCase();
  if (lowered.includes('free')) return 'Free tier available';
  if (lowered.includes('open source')) return 'Open source / self-hosted';
  if (text.match(/\$\d+/)) return 'Paid plans starting at ' + text.match(/\$\d+/)[0];
  return 'Pricing varies; check vendor site';
}

function summarizeEntry(entry) {
  const { description, content } = entry;
  const corpus = [description, content].join(' ');
  const sentences = pickSentences(corpus);
  return sentences.join(' ');
}

function buildToolProfile(entry) {
  const name = deriveName(entry.title || 'Tool');
  const summary = summarizeEntry(entry) || entry.description || 'Latest update available.';
  const keywords = [...new Set([...(entry.tags || []), ...topTokens(entry.description), ...topTokens(entry.content)])];
  const useCases = keywords.slice(0, 3).map((token) => token.replace(/-/g, ' '));
  const pros = createProCon(useCases, 'pros');
  const cons = createProCon(useCases, 'cons');

  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: summary,
    summary,
    link: entry.link,
    source: entry.source,
    isoDate: entry.isoDate,
    keywords,
    useCases,
    pros,
    cons,
    pricing: detectPricing(entry.description)
  };
}

async function processEntries(entries) {
  const toolMap = new Map();

  entries.forEach((entry) => {
    const profile = buildToolProfile(entry);
    const key = profile.slug;
    if (!toolMap.has(key)) {
      toolMap.set(key, { ...profile, mentions: 0 });
    }
    const existing = toolMap.get(key);
    existing.mentions += 1;
    existing.useCases = Array.from(new Set([...existing.useCases, ...profile.useCases])).slice(0, 4);
    existing.keywords = Array.from(new Set([...existing.keywords, ...profile.keywords])).slice(0, 6);
    existing.pros = existing.pros.concat(profile.pros).slice(0, 3);
    existing.cons = existing.cons.concat(profile.cons).slice(0, 3);
  });

  const tools = Array.from(toolMap.values()).map((tool) => ({
    ...tool,
    affiliates: []
  }));

  await fs.promises.mkdir(path.dirname(PROCESSED_PATH), { recursive: true });
  await fs.promises.writeFile(PROCESSED_PATH, JSON.stringify(tools, null, 2));

  return tools;
}

module.exports = processEntries;
