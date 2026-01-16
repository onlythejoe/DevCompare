const fetchFeeds = require('./fetch-rss');
const processEntries = require('./clean-and-summarize');
const generateContent = require('./generate-content');
const buildSite = require('./build-site');

async function runPipeline() {
  console.log('1/4 Fetching RSS feeds');
  const entries = await fetchFeeds();

  console.log(`2/4 Cleaning ${entries.length} entries`);
  const tools = await processEntries(entries);

  console.log(`3/4 Generating ${tools.length} tool profiles`);
  await generateContent(tools);

  console.log('4/4 Building static site artifacts');
  await buildSite();
}

if (require.main === module) {
  runPipeline()
    .then(() => console.log('Pipeline complete'))
    .catch((error) => {
      console.error('Pipeline failed', error);
      process.exit(1);
    });
}

module.exports = runPipeline;
