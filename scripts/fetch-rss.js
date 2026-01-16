const fs = require('fs');
const path = require('path');
const RSSParser = require('rss-parser');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'rss.json');
const RAW_PATH = path.join(__dirname, '..', 'data', 'raw', 'feeds.json');
const CACHE_PATH = path.join(__dirname, '..', 'data', 'cache', 'rss-cache.json');

const parser = new RSSParser({ timeout: 10000 });

function normalizeEntry(item, feed) {
  const cleanTitle = (item.title || '').trim();
  const cleanDescription = (item.contentSnippet || item.summary || '').replace(/\s+/g, ' ').trim();

  return {
    title: cleanTitle,
    description: cleanDescription,
    link: item.link || item.guid || '',
    isoDate: item.isoDate || item.pubDate || new Date().toISOString(),
    source: feed.name,
    tags: [...new Set([...(item.categories || []), ...(feed.defaultTags || [])])],
    content: (item.content || '').replace(/\s+/g, ' ').trim(),
    raw: item
  };
}

async function fetchFeeds() {
  const feedsConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const allEntries = [];
  const seenLinks = new Set();

  for (const feed of feedsConfig) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const entries = (parsed.items || []).map((item) => normalizeEntry(item, feed));
      entries.forEach((entry) => {
        const key = entry.link || `${entry.title}-${entry.isoDate}`;
        if (!seenLinks.has(key)) {
          seenLinks.add(key);
          allEntries.push(entry);
        }
      });
    } catch (error) {
      console.warn(`Unable to fetch ${feed.name}:`, error.message);
    }
  }

  await fs.promises.mkdir(path.dirname(RAW_PATH), { recursive: true });
  await fs.promises.mkdir(path.dirname(CACHE_PATH), { recursive: true });

  if (!allEntries.length && fs.existsSync(CACHE_PATH)) {
    console.warn('No fresh entries retrieved; falling back to cached RSS data.');
    const cachedEntries = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    await fs.promises.writeFile(RAW_PATH, JSON.stringify(cachedEntries, null, 2));
    return cachedEntries;
  }

  if (!allEntries.length) {
    console.warn('No RSS entries retrieved and no cache available; pipeline will rely on fallback profiles.');
  }

  if (allEntries.length) {
    await fs.promises.writeFile(CACHE_PATH, JSON.stringify(allEntries, null, 2));
  }

  await fs.promises.writeFile(RAW_PATH, JSON.stringify(allEntries, null, 2));

  return allEntries;
}

module.exports = fetchFeeds;
