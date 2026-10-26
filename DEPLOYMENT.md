# GitHub Pages deployment

The user authorized GitHub source publication and GitHub-hosted deployment on
26 October 2026. Only this independent game is included; no other workspace
application is published or changed.

## Publication layout

- Repository: https://github.com/Dheeraj-Baghel/brick-ball-breaker
- Live site: https://dheeraj-baghel.github.io/brick-ball-breaker/
- `main`: original application source, build/deploy tools, tests and documentation.
- `gh-pages`: only the verified contents of `dist/`, plus `.nojekyll`.
- Generated captures, backups, dependencies, credentials and local build output
  are ignored and stay off the source repository.

The repository is public to support ordinary free GitHub Pages hosting.
The project remains UNLICENSED; publishing the source does not grant an
open-source redistribution license. The game uses original local artwork,
system fonts and procedural audio, with no third-party runtime packages.

## Deployment method and updates

GitHub Pages is configured to **Deploy from a branch**, `gh-pages`, `/ (root)`.
The existing GitHub token does not have the `workflow` scope. No token permissions
were changed and no custom Actions workflow is needed. GitHub may run its own
managed Pages build/deployment internally.

Pushing source to `main` alone does **not** update the site. To publish an update:

```sh
# From a clean clone of this repository, with Node.js 24 and Git installed:
npm ci
npm run verify
git add <changed-source-files>
git commit -m "Describe the update"
git push origin main
npm run deploy:pages
```

`deploy:pages` re-runs all unit tests and the allowlisted static build before
uploading the build to `gh-pages`. It preserves deployment history and uses a
normal fast-forward push, never a force push. A concurrent remote update is
rejected; rerun after checking the change. Temporary deployment files are cleaned
up. GitHub authentication is supplied by Git's credential helper, not the source.

Check publishing status in the repository's Settings > Pages or Actions, then
verify the hosted game. Pages delivery can take a few minutes and cached files
may take time to refresh. There is no custom domain or backend.

## Browser-local progress

The live game's progress and preferences are stored in that browser's localStorage.
Localhost saves are not copied to the GitHub Pages origin. Clearing browser/site
data deletes saves. There is no cloud sync, account or save migration tool.

## Hosting limitations

Relative assets support the `/brick-ball-breaker/` repository URL without a
bundler or root-path rewrite. The debug harness is restricted to local hostnames
and is not available on GitHub Pages, including with `?test`.

GitHub Pages does not apply `netlify.toml`; those Netlify-specific cache/security
headers are not claimed on this host. The site does not collect credentials or
have a server component. Safari/Firefox, physical-phone touch feel, human audio
quality and assistive-technology review remain manual checks.

## Release verification

- Initial local gate: **83/83 unit tests passed**, static build succeeded,
  19 application files / 123 KB before its build manifest.
- A pattern scan found no credential/private-key patterns in the publishable source.
- Clean shallow clone from GitHub: `npm ci`, all 83 unit tests and the production
  build passed; dependency audit found zero vulnerabilities.
- GitHub managed [Pages run](https://github.com/Dheeraj-Baghel/brick-ball-breaker/actions/runs/40272171460)
  succeeded. Pages source is `gh-pages` root, HTTPS is enforced, and the live
  document returns HTTP 200. Published branch commit:
  `a462dcdf1b991ccab47f61a77e435b7066884802`.
- **13/13 local built-output Chromium checks** passed: loading/assets, gameplay,
  power-ups, saved level/preferences, corrupt/blocked storage recovery, lifecycle,
  touch/responsiveness, palette, frame timing and zero console/page errors.
- **9/9 real hosted Chromium checks** passed: five-mode HTTPS startup, SHA-256
  equality for all 19 application files, public debug-harness blocking, campaign
  keyboard launch/pause freeze/resume/restart, hosted preference persistence,
  all remaining mode launch/menu flows, collection navigation, emulated iPhone
  tap-launch/pause/arena fit/no overflow, and zero console/page/network errors.
- Desktop home and mobile paused-arena captures were visually inspected.
  Test captures/results are local under `artifacts/testing/github-pages/`.
- Two initial hosted QA assertions were corrected without changing the game:
  a screenshot included the pause-overlay entrance animation instead of only the
  game canvas, and launch validation was reading the aiming status before the
  next animation frame. The final full hosted run passed without retries.

Optional hosted verification from this repository (Playwright is QA-only):

```sh
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install chromium
npm run build
node tests/hosted-pages.mjs
```

The published game does not ship these tools or their dependencies. Local
production tests used the existing workspace Playwright installation read-only;
no other project's code or package files were changed. All hosted test contexts
were temporary; no real user's save data was modified.
