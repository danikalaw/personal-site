# Garrett and Danika's wedding archive

This directory is a static, display-preserving copy of the former WordPress site at `wedding.danikalaw.com`.

- `public/` is the Cloudflare Workers static-assets directory.
- Dynamic WordPress features are intentionally inert; the original RSVP area was already hidden.
- YouTube, Google Maps, and Google Fonts remain external embeds so the page keeps its original appearance and content.
- Re-capture from the live Bluehost copy with `wget --page-requisites --convert-links --adjust-extension --no-host-directories --directory-prefix=wedding-archive/public https://www.wedding.danikalaw.com/`, then run `node scripts/normalize-wedding-archive.mjs`.
- Validate the snapshot with `npm run verify:wedding` from the repository root.
