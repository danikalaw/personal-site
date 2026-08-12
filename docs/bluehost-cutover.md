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
- `danikalaw.com` still delegates to `ns1.bluehost.com` and `ns2.bluehost.com` and resolves to the Bluehost server at `108.179.200.151`.

This means moving Danika's two sites is not yet enough to safely cancel the shared hosting plan. Garrett's cutover must finish propagating, and Economics Detective must be cut over or intentionally retired.

## Mail warning

`danikalaw.com` currently publishes this mail route:

```text
MX 0 mail.danikalaw.com
```

That destination is on the Bluehost server. Cancelling hosting or replacing DNS without preserving the complete mail configuration may stop mail for addresses at `@danikalaw.com`. Confirm whether any such mailbox or forwarding rule is in use before the nameserver switch.

## Safe order of operations

1. Push and validate the repository's `main` branch.
2. Create both Cloudflare Pages projects with Git integration and test their `pages.dev` URLs.
3. Add `danikalaw.com` to Cloudflare DNS and carefully review every imported record, especially MX, SPF, DKIM, and DMARC records.
4. Add both the canonical and alias hostnames to their respective Pages projects: `danikalaw.com` plus `www.danikalaw.com`, and `www.wedding.danikalaw.com` plus `wedding.danikalaw.com`.
5. Create Cloudflare Single Redirect rules that preserve the existing hostname behavior: `www.danikalaw.com` to the apex, and `wedding.danikalaw.com` to `www.wedding.danikalaw.com`, retaining the request path.
6. At the Bluehost registrar, replace only the `danikalaw.com` authoritative nameservers with the pair assigned by Cloudflare.
7. Verify the apex, `www`, wedding subdomain, redirects, TLS, and any domain mail after DNS propagation.
8. Keep Bluehost hosting active while Garrett's recent cutover finishes propagating, Economics Detective is cut over, and the new DNS has been stable.
9. Cancel the hosting plan only after all four sites and any Bluehost-backed mail are accounted for. Keep the domain registrations and auto-renewal active unless they are separately transferred to another registrar.

Cancelling Bluehost is intentionally not an automated repository step; it is a billing and data-removal action that should happen only after a final live inventory.
