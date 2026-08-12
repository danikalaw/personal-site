# danikalaw.com

A static Astro site for Danika Law, rebuilt from the former WordPress site and intended for Git-connected deployment on Cloudflare Pages.

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

The `npm run export:wordpress` command refreshes the personal-site content from the live WordPress REST API. It fails if an upload cannot be saved locally or exceeds Cloudflare Pages' per-file limit.

## Cloudflare Pages

Use Git integration rather than Direct Upload so Cloudflare mirrors the `main` branch automatically.

| Project | Root directory | Build command | Output directory | Custom domain |
| --- | --- | --- | --- | --- |
| `danika-site` | `/` | `npm run build` | `dist` | `danikalaw.com`, `www.danikalaw.com` |
| `danika-wedding-archive` | `wedding-archive` | *(none)* | `public` | `www.wedding.danikalaw.com`, `wedding.danikalaw.com` |

The root `wrangler.jsonc` and `wedding-archive/wrangler.jsonc` keep local Cloudflare settings versioned with each site. Do not create these projects with `wrangler pages deploy`: a Direct Upload Pages project cannot later be converted to Git integration.

Pages `_redirects` files only support path-level redirects. Preserve the existing hostname behavior with Cloudflare Single Redirect rules at the DNS zone level:

- `www.danikalaw.com/*` → `https://danikalaw.com/${1}`
- `wedding.danikalaw.com/*` → `https://www.wedding.danikalaw.com/${1}`

See [`docs/bluehost-cutover.md`](docs/bluehost-cutover.md) before changing DNS or cancelling hosting.
