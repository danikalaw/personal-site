# danikalaw.com

A static Astro site for Danika Law, rebuilt from the former WordPress site and deployed from Git with Cloudflare Workers Static Assets.

The repository also contains a display-preserving static archive of Garrett and Danika's wedding site.

## Local development

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Run the complete validation suite before publishing:

```sh
npm run validate
```

## Content

- `src/data/wordpress.json` contains the normalized page and post content used by Astro.
- `public/media/` contains the original WordPress uploads.
- `archive/wordpress/` contains the raw WordPress REST API export for preservation.
- `wedding-archive/public/` is the independently deployable wedding-site snapshot.

The `npm run export:wordpress` command refreshes the personal-site content from the live WordPress REST API. It fails if an upload cannot be saved locally or exceeds Cloudflare Workers' per-file limit.

## Cloudflare Workers

Use Git integration so Cloudflare mirrors the `main` branch automatically.

| Worker | Root directory | Build command | Deploy command | Custom domain |
| --- | --- | --- | --- | --- |
| `personal-site` | `/` | `npm run build` | `npx wrangler deploy` | `danikalaw.com`, `www.danikalaw.com` |
| `danika-wedding-archive` | `/` | `npm run verify:wedding` | `npx wrangler deploy --config wedding-archive/wrangler.jsonc` | `www.wedding.danikalaw.com`, `wedding.danikalaw.com` |

The root `wrangler.jsonc` and `wedding-archive/wrangler.jsonc` keep each static-assets deployment versioned with the site.

Preserve the existing hostname behavior with Cloudflare Single Redirect rules at the DNS zone level:

- `www.danikalaw.com/*` → `https://danikalaw.com/${1}`
- `wedding.danikalaw.com/*` → `https://www.wedding.danikalaw.com/${1}`

See [`docs/bluehost-cutover.md`](docs/bluehost-cutover.md) before changing DNS or cancelling hosting.
