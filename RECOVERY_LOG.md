# Recovery Log - 2026-05-19 Git Incident

## Cause

During GitHub Pages deployment, Claude Code performed destructive git operations on an orphan `gh-pages` branch without first checking for uncommitted working tree changes. The commands `git checkout --orphan gh-pages` followed by `git rm -rf .` deleted all uncommitted source files from the working tree. When switching back to `main`, git only restored the last committed state — **one week of uncommitted changes were wiped.**

**Root cause:** No `git stash` or commit was made before branching operations. No check for dirty working tree was performed.

## Files Affected & Recovery Status

### Source Code (all recovered)

| File | Recovery Source | Version Date | Status |
|------|----------------|-------------|--------|
| src/components/Board.jsx | Claude Code history (transcript 9332fb3d) | May 19 | RECOVERED - full card system intact |
| src/components/IslandContainer.jsx | Claude Code history (transcript 9332fb3d) | May 19 | RECOVERED |
| src/components/Player.jsx | Claude Code history (transcript afe8fbd7) | May 18 | RECOVERED |
| src/components/Player.css | Claude Code history (transcript afe8fbd7) | May 18 | RECOVERED |
| src/components/Scorecard.jsx | Claude Code history (transcript e91f690e) | May 12 | RECOVERED |
| src/components/Scorecard.css | Claude Code history (transcript e91f690e) | May 12 | RECOVERED |
| src/Palette.js | Claude Code history (transcript d1f758ed) | May 18 | RECOVERED |
| src/appConfig.js | Claude Code history (transcript f8444983) | May 19 | RECOVERED |
| src/index.css | Claude Code history (transcript ccb60e22) | May 9 | RECOVERED |
| src/main.jsx | Claude Code history (transcript 5b42ffa1) | May 10 | RECOVERED |
| src/hooks/useBoardZoom.js | Claude Code history (transcript 7c738079) | May 19 | RECOVERED |
| src/utils/shotPhysics.js | Claude Code history (transcript aa72727b + d1f758ed) | May 19 | RECOVERED |
| src/simulate.js | Claude Code history (transcript 5b42ffa1 + e91f690e) | May 12 | RECOVERED |

### Static Data (all recovered)

| Content | Recovery Source | Status |
|---------|----------------|--------|
| dist/map/ (4 maps) | Dangling git commit 24956c1 | RECOVERED |
| dist/mock-record/ | Dangling git commit 24956c1 | RECOVERED |
| dist/npc-data/ (50 reports) | Dangling git commit 24956c1 | RECOVERED |

### Security

| Item | Status |
|------|--------|
| .mcp.json with bearer token | REMOVED from git, added to .gitignore |
| Bearer token `pfmcp_L0onFWj...` | User should revoke if pushed to remote |

### GitHub Pages Setup (pending)

| Item | Status |
|------|--------|
| vite.config.js base path | DONE - set to `/SneakySwingChessGame/` |
| .github/workflows/deploy.yml | DONE - GitHub Actions auto-deploy |
| .mcp.json in .gitignore | DONE |
| Push to GitHub | PENDING - user needs to commit and push |
| Enable Pages from GitHub Actions | PENDING - user needs to enable in repo settings |
| Make repo public | PENDING - required for free GitHub Pages |

## Still TODO

- [ ] Verify all recovered files compile and run correctly (`npm run dev`)
- [ ] Check for any files not listed above that may have been lost
- [ ] Commit all recovered files to main
- [ ] Push to GitHub origin
- [ ] Make repo public
- [ ] Enable GitHub Pages with Actions source
- [ ] Revoke exposed bearer token if it was ever pushed to remote

## Lessons Learned

1. **Always check for uncommitted changes** before any `git checkout --orphan` or `git rm -rf`
2. **Stash or commit first** when doing destructive branch operations
3. **Add files to .gitignore** before they ever get staged (e.g., .mcp.json)
4. **Commit frequently** - one week of uncommitted work is a single point of failure
