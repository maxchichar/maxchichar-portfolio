# Social link previews

The homepage publishes Open Graph and Twitter `summary_large_image` metadata,
an absolute canonical URL, and a 1200×630 PNG. The card uses the existing logo,
Inter Tight and JetBrains Mono fonts, and black, white and purple palette.

`public/og-default.png` is the checked-in homepage card and structured-data
fallback. `src/app/opengraph-image.tsx` serves it as a static build artifact,
without database or external image requests. Other pages keep their generated
cards and explicit image overrides.

Regenerate the homepage asset after changing its design:

```sh
npm run generate:social-preview
```

Set `NEXT_PUBLIC_SITE_URL=https://chibuezemaxwell.com` in the production host.
`SITE_URL` is the server-only alternative. In production, the same domain is
also the fallback when neither variable is set, including on preview hosts.
Explicit environment overrides take priority; use an origin without a path.
Local development continues to support localhost and `PORT`.

Verify the production build locally (no database credentials are needed for
the homepage card):

```sh
npm run build
npm start
# In another terminal:
npm run verify:social-preview -- http://localhost:3000
```

After deployment:

```sh
npm run verify:social-preview -- https://chibuezemaxwell.com
```

The verifier requests the homepage as Twitterbot, Facebook's crawler, and
LinkedInBot. It checks metadata in the initial HTML head, the canonical and
image origins, matching Twitter/Open Graph images, PNG content type, and the
actual 1200×630 image dimensions.

Sharing services control their own presentation and cache. After deploying a
new image, request a re-scrape in Facebook Sharing Debugger or LinkedIn Post
Inspector if an old card persists. A metadata change cannot force every site
to display a card or refresh its cache immediately.
