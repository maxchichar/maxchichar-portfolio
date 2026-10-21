import assert from "node:assert/strict";

// node --import tsx scripts/verify-social-preview.ts [origin] [canonical-origin]
const origin = process.argv[2] || "http://localhost:3000";
const canonicalOrigin = process.argv[3] || "https://chibuezemaxwell.com";

async function main() {
  for (const userAgent of ["Twitterbot/1.0", "facebookexternalhit/1.1", "LinkedInBot"]) {
    const response = await fetch(origin, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    const head = html.split("</head>")[0]!;
    const tags: Record<string, string> = {};
    for (const match of head.matchAll(/<(?:meta|link)\s+[^>]*>/g)) {
      const attrs = Object.fromEntries(
        [...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [
          a[1],
          a[2]!.replaceAll("&amp;", "&"),
        ]),
      );
      const name = attrs.property || attrs.name || attrs.rel;
      if (name) tags[name] = attrs.content || attrs.href;
    }
    assert.equal(new URL(tags.canonical || "").origin, canonicalOrigin);
    assert.equal(new URL(tags["og:url"] || "").origin, canonicalOrigin);
    assert.equal(tags["og:type"], "website");
    assert.equal(tags["twitter:card"], "summary_large_image");
    for (const key of [
      "og:title",
      "og:description",
      "og:site_name",
      "og:image:alt",
      "twitter:title",
      "twitter:description",
      "twitter:image:alt",
    ]) {
      assert.ok(tags[key], `${userAgent}: missing ${key} in head`);
    }
    assert.equal(tags["og:image:width"], "1200");
    assert.equal(tags["og:image:height"], "630");
    assert.equal(tags["og:image"], tags["twitter:image"]);
    const imageUrl = new URL(tags["og:image"] || "");
    assert.equal(imageUrl.origin, canonicalOrigin);
    // Fetch from the target server while checking its published absolute URL.
    const imageResponse = await fetch(
      new URL(imageUrl.pathname + imageUrl.search, origin),
      {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(30_000),
      },
    );
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get("content-type") || "", /^image\/png/);
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    console.log(
      `${userAgent}: head metadata and ${bytes.length}-byte 1200×630 PNG verified`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
