# plank.to website

Static Astro site (TypeScript) with Overview, Help, Accessibility, and Privacy pages. It is independent of the app and never handles planner data.

```
npm install
npm run dev          # local dev server
npm run build        # static output in dist/
npm run typecheck    # astro check
npm run format:check
npm run check:independence  # builds, then scans source and dist
```

Requires Node 22.22+.

## Firebase Hosting

Hosting only (no Firestore, Auth, or database). [firebase.json](../firebase.json) serves `web/dist` as static files with `cleanUrls` and `trailingSlash` to match Astro's `/page/index.html` output, no SPA rewrite (unknown paths return a real 404), security headers, and long immutable caching for hashed `/_astro/` assets.

Workflows: [web-preview.yml](../.github/workflows/web-preview.yml) deploys a 7-day preview channel per same-repo pull request; [web-deploy.yml](../.github/workflows/web-deploy.yml) deploys to the live channel on pushes to `main` that touch the site (or manually).

One-time setup (owner):

1. Create a Firebase project and enable Hosting.
2. Set the project id in [.firebaserc](../.firebaserc) (done: `plank-to`).
3. Add the repository variable `FIREBASE_PROJECT_ID` (Settings > Secrets and variables > Actions > Variables).
4. Add the repository secret `FIREBASE_SERVICE_ACCOUNT`: the JSON key of a service account with the Firebase Hosting Admin role (and Cloud Run Viewer / API Keys Viewer as the action docs require). `firebase init hosting:github` can create it, but do not let it overwrite these files.

Manual deploys are not needed; do not commit keys.
