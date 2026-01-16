# DevCompare

DevCompare is a 100% free, Node.js-powered automation engine that turns developer RSS feeds into structured comparison pages, SaaS directories, and AI-ready summaries. Everything runs locally (or in GitHub Actions) with no paid APIs, no servers, and no databases—only static Markdown/HTML files that publish directly to GitHub Pages using the `/docs` folder.

## Quick start
1. `npm install`
2. `npm run pipeline` (fetch → clean → generate → build)
3. Push the repo to `main` and let the GitHub Actions workflow run daily; generated HTML lives under `/docs` and is wired to GitHub Pages.

## Pipeline overview
1. **RSS fetcher** (`scripts/fetch-rss.js`): pulls feeds from `config/rss.json`, deduplicates by URL, logs failures, and caches to `data/cache/rss-cache.json` so the pipeline can continue even when feeds are unreachable.
2. **Content cleaner** (`scripts/clean-and-summarize.js`): scrubs HTML, tokenizes text, ranks sentences, and builds normalized tool profiles with pros/cons, use cases, and pricing hints.
3. **Content generator** (`scripts/generate-content.js`): produces best-of lists, comparisons, weekly roundups, and category directories, embeds machine summaries, FAQ blocks, affiliate links, schema.org/JSON-LD (Article + FAQPage + Product), and writes Markdown to `/content` plus metadata to `/data/generated/pages.json`.
4. **Static builder** (`scripts/build-site.js`): converts Markdown into semantic HTML using `/templates`, generates `/docs/index.html`, `/docs/rss.xml`, `/docs/sitemap.xml`, `/docs/robots.txt`, and renders every content page with canonical and meta tags.
5. **Pipeline runner** (`scripts/run-pipeline.js`): orchestrates the steps so GitHub Actions can run the same command (`npm run pipeline`).

## Configuration

### Change the niche
- Swap out feeds in `config/rss.json` so they match your new topic (name, URL, category, tags).
- Update `config/categories.json` with new category names, keywords, and typical tools for AI-friendly directories.
- Change `BASE_URL` in `scripts/generate-content.js` and `scripts/build-site.js` if your GitHub Pages domain differs from `https://devcompare.github.io`.

### Add RSS feeds
- Append entries to `config/rss.json` with `name`, `url`, `category`, and `defaultTags` (e.g., `["dev","tools","productivity"]`).
- The fetcher deduplicates links, logs failures, and stores a fallback cache at `data/cache/rss-cache.json`.

### Add affiliate links
- Edit `config/affiliate.json` to map keywords/tool names to affiliate URLs. Example:
  ```json
  {
    "Notion": "https://notion.so/?ref=XXXX",
    "GitHub": "https://github.com?ref=XXXX",
    "Webflow": "https://webflow.com?ref=XXXX"
  }
  ```
- The generator wraps tool headings with affiliate links and adds CTA lines inside every tool section.

### Duplicate for another niche
1. Fork or clone this repo.
2. Replace `config/rss.json`, `config/categories.json`, and `config/affiliate.json` with the new niche data.
3. Update `BASE_URL` constants if you publish under a different domain.
4. Run `npm install` + `npm run pipeline` to boot the first batch, then rely on GitHub Actions.

## GitHub Pages deployment
- Configure Pages on the `main` branch to serve from the `/docs` folder (Project Settings → Pages → Source: `main` branch, folder: `/docs`).
- `.github/workflows/auto-content.yml` runs on a daily cron (`0 6 * * *`) plus manual triggers (`workflow_dispatch`), executes `npm install` and `npm run pipeline`, then commits `/docs`, `/content`, and `/data/generated` using `git add -A` and pushes back to `main`.
- Ensure `GITHUB_TOKEN` has `contents: write` so the workflow can push updated content.

## Output details
- `/docs/index.html`: AI-friendly homepage listing the latest generated pages.
- `/docs/*.html`: SEO-ready H1s, introductions, tool lists (description/use cases/pros/cons/pricing), FAQs, summary blocks, and JSON-LD (Article + FAQPage + Product).
- `/docs/rss.xml`, `/docs/sitemap.xml`, `/docs/robots.txt`: feed, sitemap, and crawler instructions for AI shopping agents.
- `/content/*.md`: source Markdown that any generator or review workflow can inspect.

## Sample enriched page
- `content/best-dev-tools-for-productivity.md` now includes the required `#` title, `## Machine Summary`, `## Brief`, per-tool sections with affiliate CTAs, `## FAQ`, `## Summary Block`, concluding thoughts, and JSON-LD for Article + FAQPage + multiple Product entries.

## Notes
- The pipeline is purely static and free; only open feeds and local JS modules are used.
- Caching, deduping, and graceful failure handling keep the automation stable for daily GitHub Actions runs.
