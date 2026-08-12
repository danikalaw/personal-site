# Bluehost to Cloudflare cutover

Inventory captured on 2026-08-12.

## What Bluehost still lists

The Bluehost hosting account lists these four sites:

- `danikalaw.com`
- `wedding.danikalaw.com`
- `garrettpetersen.com`
- `economicsdetective.com`

Registry-level nameserver checks give the more accurate live-cutover status:

- `garrettpetersen.com` now delegates to Cloudflare (`sonia.ns.cloudflare.com` and `owen.ns.cloudflare.com`). Some recursive DNS caches still return the old Bluehost address while the recent change propagates.
- `economicsdetective.com` still delegates to `ns1.bluehost.com` and `ns2.bluehost.com`, although a replacement `economics-detective` Worker and a pending Cloudflare zone exist.
- `danikalaw.com` was changed at Bluehost to Cloudflare's nameservers on 2026-08-12. DNS caches may temporarily return the old Bluehost delegation while the change propagates.

This means moving Danika's two sites is not yet enough to safely cancel the shared hosting plan. Garrett's cutover must finish propagating, and Economics Detective must be cut over or intentionally retired.

## Cloudflare deployment status

The `danikalaw.com` zone is on Cloudflare's Free plan. Its authoritative nameservers are:

```text
owen.ns.cloudflare.com
sonia.ns.cloudflare.com
```

Both static sites are deployed as Cloudflare Workers with GitHub integration:

- `danikalaw.com` and `www.danikalaw.com` use the `personal-site` Worker.
- `www.wedding.danikalaw.com` and `wedding.danikalaw.com` use the `danika-wedding-archive` Worker.

Cloudflare now has 31 DNS records: 27 preserved Bluehost records plus four Worker-managed web records. The Bluehost mail, FTP, calendar, contact, and control-panel hosts remain **DNS only** so Cloudflare does not intercept unsupported protocols. Canonical redirect rules preserve paths and query strings from `www.danikalaw.com` to the apex and from `wedding.danikalaw.com` to `www.wedding.danikalaw.com`.

## Mail warning

`danikalaw.com` currently publishes this mail route:

```text
MX 0 mail.danikalaw.com
```

That destination is still on the Bluehost server. The nameserver cutover preserves the existing MX, SPF, mail host, and service records, so mail continues to use Bluehost. Cancelling Bluehost hosting may stop mail for addresses at `@danikalaw.com`; confirm whether any mailbox or forwarding rule is in use and migrate it before cancelling hosting.

## Safe order of operations

1. Push and validate the repository's `main` branch.
2. Create both Cloudflare Workers static-assets projects with Git integration and test their `workers.dev` URLs.
3. Add `danikalaw.com` to Cloudflare DNS and carefully review every imported record, especially MX, SPF, DKIM, and DMARC records. *(Complete.)*
4. Add both the canonical and alias hostnames to their respective Workers: `danikalaw.com` plus `www.danikalaw.com`, and `www.wedding.danikalaw.com` plus `wedding.danikalaw.com`. *(Complete.)*
5. Create Cloudflare Single Redirect rules that preserve the existing hostname behavior: `www.danikalaw.com` to the apex, and `wedding.danikalaw.com` to `www.wedding.danikalaw.com`, retaining the request path and query string. *(Complete.)*
6. At the Bluehost registrar, replace only the `danikalaw.com` authoritative nameservers with the pair assigned by Cloudflare. *(Submitted 2026-08-12; propagation in progress.)*
7. Verify the apex, `www`, wedding subdomain, redirects, TLS, and any domain mail after DNS propagation.
8. Keep Bluehost hosting active while Garrett's recent cutover finishes propagating, Economics Detective is cut over, and the new DNS has been stable.
9. Cancel the hosting plan only after all four sites and any Bluehost-backed mail are accounted for. Keep the domain registrations and auto-renewal active unless they are separately transferred to another registrar.

Cancelling Bluehost is intentionally not an automated repository step; it is a billing and data-removal action that should happen only after a final live inventory.
