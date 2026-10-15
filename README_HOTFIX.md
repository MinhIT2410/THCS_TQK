# Hotfix: Vercel JSX build error

## Files
- `src/components/home/Home.tsx`: removes the malformed conditional wrapper around the home news section, leaving it hidden. The existing news data, CMS logic and routes are not deleted.
- `src/config/menu.ts`: retains the menu rename `Tin tức` -> `Mở rộng` and its position after `Thi đua`.

## Deploy
Copy the `src/` folder contents into the matching paths in your latest repository, review the two changed files in GitHub Desktop, then commit and push. Do not delete any other files. No SQL migration required.

## Verify
- Home page no longer shows the news cards.
- Home page shows up to 6 timeline activities.
- Menu displays `Mở rộng` after `Thi đua`.
- `npm run build` succeeds.

This hotfix does not alter database data or old Markdown files. Full-project build was not verified in this packaging environment.
