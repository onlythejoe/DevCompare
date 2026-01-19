# Rollback Instructions

## Quick rollback (recommended)
1. Identify the commit SHA for the enrichment changes:
   - `git log --oneline`
2. Revert the commit:
   - `git revert <commit-sha>`
3. Push the revert:
   - `git push`

## Manual rollback
1. Restore the previous versions of these files from Git history:
   - `scripts/clean-and-summarize.js`
   - `scripts/generate-content.js`
   - `scripts/build-site.js`
   - `templates/page.html`
   - `CHANGELOG.md`
   - `ROLLBACK.md`
2. Regenerate the site (if needed):
   - `npm run pipeline`
3. Commit and push the rollback changes.
