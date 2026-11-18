#!/bin/sh
# Build the site and publish it to the gh-pages branch, which GitHub Pages serves.
set -e
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
remote=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "Published to GitHub Pages."
