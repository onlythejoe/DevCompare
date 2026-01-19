# DevCompare Architecture Map

## Repository layout (top-level)
- **config/**: RSS feeds, category taxonomy, affiliate mappings used by the pipeline. (`config/rss.json`, `config/categories.json`, `config/affiliate.json`)【F:config/rss.json†L1-L31】【F:config/categories.json†L1-L23】【F:config/affiliate.json†L1-L9】
- **scripts/**: end-to-end content pipeline (RSS ingest → clean → generate → build).【F:scripts/run-pipeline.js†L1-L26】
- **data/**: generated pipeline artifacts (raw cache, processed profiles, generated pages, generated markdown).【F:scripts/fetch-rss.js†L5-L9】【F:scripts/clean-and-summarize.js†L16-L123】【F:scripts/generate-content.js†L10-L22】【F:scripts/build-site.js†L5-L10】
- **docs/**: static HTML output (GitHub Pages publishing root).【F:scripts/build-site.js†L5-L10】【F:README.md†L3-L5】
- **templates/**: HTML/XML template files for page rendering (page layout, home, rss, sitemap, robots).【F:scripts/build-site.js†L146-L152】
- **content/**: legacy/source markdown pages checked in (pre-generated snapshots).【F:README.md†L56-L65】

## Content sources
- **RSS feed list**: `config/rss.json` provides feed URLs, names, categories, default tags.【F:config/rss.json†L1-L31】
- **Affiliate link mapping**: `config/affiliate.json` assigns affiliate URLs by tool keywords/names.【F:config/affiliate.json†L1-L9】
- **Category taxonomy**: `config/categories.json` provides category names, keywords, and typical tools for tagging and navigation.【F:config/categories.json†L1-L23】

## Build system (custom Node.js pipeline)
- **Pipeline runner**: `scripts/run-pipeline.js` orchestrates fetch → clean → generate → build via Node scripts.【F:scripts/run-pipeline.js†L1-L26】
- **RSS ingestion**: `scripts/fetch-rss.js` reads `config/rss.json`, fetches feeds, normalizes entries, and writes raw/cache JSON files.【F:scripts/fetch-rss.js†L5-L83】
- **Cleaning & processing**: `scripts/clean-and-summarize.js` strips HTML, tokenizes, derives keywords, pros/cons, pricing, then writes `data/processed/tools.json`.【F:scripts/clean-and-summarize.js†L16-L123】
- **Content generation**: `scripts/generate-content.js` creates dated page metadata and Markdown (JSON-LD, FAQ, summaries, tool sections) in `data/generated`.【F:scripts/generate-content.js†L10-L279】
- **Static site build**: `scripts/build-site.js` renders Markdown using templates into static HTML/feeds under `docs/` (GitHub Pages).【F:scripts/build-site.js†L5-L315】

## Output structure (HTML generation)
- **Generated metadata**: `data/generated/pages.json` lists all pages, metadata, and markdown paths for the build step.【F:scripts/generate-content.js†L10-L279】
- **Generated Markdown**: `data/generated/markdown/*.md` contains dated content snapshots used by the HTML renderer.【F:scripts/generate-content.js†L10-L279】
- **Static site output**: `docs/` contains HTML pages (`index.html`, `latest.html`, `archive.html`, category pages) plus `rss.xml`, `sitemap.xml`, and `robots.txt`.【F:scripts/build-site.js†L164-L313】

## Notes on LLM usage
- The pipeline is purely script-driven with RSS parsing, text cleanup, and Markdown/HTML generation; no LLM calls are present in the scripts or workflow. (All steps are local Node.js scripts.)【F:scripts/run-pipeline.js†L1-L26】【F:README.md†L3-L9】
