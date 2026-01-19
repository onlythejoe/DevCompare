# Editorial Enrichment Points (No-LLM)

## Text structuring
- **clean-and-summarize.js → `summarizeEntry()` / `pickSentences()`**: Adjust sentence scoring, minimum length, or ordering to produce tighter summaries.【F:scripts/clean-and-summarize.js†L41-L90】
- **generate-content.js → `buildMachineSummary()` / `buildKeyFacts()` / `buildPageMarkdown()`**: Standardize headings, add editorial sections, or reorder block layout for consistency.【F:scripts/generate-content.js†L126-L199】

## Sectioning & templates
- **templates/**: Adjust HTML structure, add section wrappers, or insert standardized callouts in `page.html` / `home.html` templates used in `build-site.js`.【F:scripts/build-site.js†L146-L152】
- **build-site.js → `renderCard()` / `renderListItem()` / `renderCategorySections()`**: Control card/list layout and grouping by section types to improve editorial readability.【F:scripts/build-site.js†L55-L124】

## Keyword extraction
- **clean-and-summarize.js → `tokenize()` / `topTokens()`**: Replace stop-word list, adjust token filters, or add domain-specific weighting to improve extracted keywords for tagging and summaries.【F:scripts/clean-and-summarize.js†L16-L60】

## Tag enrichment & metadata
- **fetch-rss.js → `normalizeEntry()`**: Expand tags by combining RSS categories with feed default tags for stronger metadata coverage.【F:scripts/fetch-rss.js†L11-L26】
- **generate-content.js → `matchCategoriesForPage()`**: Add extra matching rules (synonyms, alias map) to strengthen category assignment.【F:scripts/generate-content.js†L200-L229】
- **generate-content.js → `pickAffiliate()`**: Extend affiliate mapping logic with aliases or regex keyword matchers for richer CTAs.【F:scripts/generate-content.js†L31-L49】

## Comparative tables (static formatting only)
- **generate-content.js → `renderToolSection()`**: Insert a Markdown table per tool (e.g., Pricing / Use cases / Source) without changing HTML rendering logic.【F:scripts/generate-content.js†L50-L88】
- **build-site.js → MarkdownIt rendering**: Tables are supported by Markdown-It if the table extension is enabled (would be a change if needed). Otherwise, preformatted HTML tables can be injected directly into Markdown.【F:scripts/build-site.js†L177-L178】

## Observability & cadence control (no LLM)
- **.github/workflows/auto-content.yml**: The job runs daily on a cron schedule and can be adjusted for timezone/coverage or separated into validation vs. publishing steps.【F:.github/workflows/auto-content.yml†L1-L33】

## Suggested insertion points (summary list)
1. RSS normalization and tag expansion: `scripts/fetch-rss.js`.
2. Tokenization, keywords, and summaries: `scripts/clean-and-summarize.js`.
3. Section ordering, headings, and CTA blocks: `scripts/generate-content.js`.
4. Layout and directory grouping for category/archive pages: `scripts/build-site.js` + `templates/`.
5. Pipeline cadence and deployment gates: `.github/workflows/auto-content.yml`.
