# DevCompare

DevCompare is a Node.js-powered autonomous content engine that turns free developer RSS feeds into structured, AI-search-optimized comparison pages. It is built to run on GitHub Actions and publish straight to GitHub Pages, relying only on open web supplies, no paid AI APIs, no databases, and no servers.

## Pipeline overview

1. **RSS Fetcher** (`scripts/fetch-rss.js`) pulls feeds defined in `config/rss.json`, normalizes every entry, deduplicates by URL, logs failures, and stores the raw data along with a local cache (`data/cache/rss-cache.json`). Cached data keeps the pipeline running when feeds are temporarily unreachable.
2. **Content cleaner** (`scripts/clean-and-summarize.js`) strips HTML noise, applies TF-IDF/TextRank-style heuristics, generates tool profiles (descriptions, use cases, pros/cons, pricing), and deduplicates by tool slug.
3. **Content generator** (`scripts/generate-content.js`) produces the five required page types plus directories, inserts machine summaries, FAQ sections, affiliate links, and JSON-LD aggregating Article, FAQPage, and Product schemas.
4. **Static build** (`scripts/build-site.js`) converts Markdown to semantic HTML templates, emits `public/index.html`, `rss.xml`, `sitemap.xml`, `robots.txt`, and per-page HTML ready for GitHub Pages.
5. **Pipeline runner** (`scripts/run-pipeline.js`) chains every step so automation is consistent whether run manually or via CI.

## Configuration

### Change the niche
- Update `config/rss.json` with feeds relevant to the new niche (name, URL, category, and tags).
- Update `config/categories.json` to define the directories and keywords the engine should highlight.
- If necessary, adjust `BASE_URL` constants in `scripts/generate-content.js` and `scripts/build-site.js` to point to the new site domain.

### Update RSS feeds
- Add or replace entries in `config/rss.json`. Each entry should define `name`, `url`, `category`, and `defaultTags` (e.g., `["dev","tools","productivity"]`).
- The fetcher deduplicates links and persists a local cache at `data/cache/rss-cache.json` so the system gracefully falls back if feeds fail.

### Add affiliate links
- Map keywords or tool names to affiliate URLs in `config/affiliate.json`. Example entries:
  ```json
  {
    "Notion": "https://notion.so/?ref=XXXX",
    "GitHub": "https://github.com?ref=XXXX",
    "Webflow": "https://webflow.com?ref=XXXX"
  }
  ```
- The content generator automatically wraps tool titles with affiliate links when a keyword match is found and also lists dedicated affiliate CTAs beside the tool metadata.

### Duplicate for another niche
1. Fork or clone this repo.
2. Replace `config/rss.json`/`config/categories.json`/`config/affiliate.json` to match the new niche.
3. Update `BASE_URL` references in the scripts if the deployment domain changes.
4. Rename the project (package metadata, README text) so automation logs stay consistent.
5. Run `npm install` and `npm run pipeline` to bootstrap the first content batch.

## GitHub Pages deployment
- Configure your Pages branch to serve from `/public` (e.g., `gh-pages` branch or `main` root) so the generated HTML is published.
- The GitHub Actions workflow (`.github/workflows/auto-content.yml`) runs daily (`cron: 0 6 * * *`), installs dependencies, runs `npm run pipeline`, then commits and pushes regenerated content (`content`, `data/generated`, `public`).
- Ensure `GITHUB_TOKEN` has write rights so the workflow can push updates.

## Output details
- `/content/*.md`: structured Markdown with `#` headings, a machine summary block, FAQs, pros/cons, use cases, pricing, and summary blocks.
- `/public/*.html`: Semantic HTML templates with clean meta descriptions, canonical tags, and JSON-LD that combines Article, FAQPage, and Product schemas.
- `/public/rss.xml`: Site feed for AI agents.
- `/public/sitemap.xml` and `/public/robots.txt`: Provide SEO crawlers with clean URLs and sitemap references.

## Sample enriched page (generated example)
- `content/best-dev-tools-for-productivity.md`: Includes `# Best Developer Tools for Productivity Workflows`, a `## Machine Summary` block, `## Brief` intro, per-tool sections (description, use cases, pros, cons, pricing, affiliate link), `## FAQ`, `## Summary Block`, concluding thoughts, and JSON-LD array covering Article, FAQPage, and Product entities.

## Running locally
1. Install dependencies: `npm install` (no paid APIs required).
2. Run the pipeline: `npm run pipeline` (fetch -> clean -> generate -> build).
3. Serve the `/public` directory with any static server to preview before pushing to GitHub Pages.

## Notes
- The pipeline remains 100% free, using only open RSS data and local JS processing.
- Caching, deduplication, and error handling keep the automation resilient so you can publish every day without manual edits.
