/**
 * Prepares a received email's HTML for the admin inbox. The HTML is shown
 * in an iframe sandboxed without scripts, under its own CSP; this cleanup is
 * the second layer: it removes anything active or self-navigating and
 * notes whether the email loads remote images (which track opens, so they
 * stay blocked until the admin asks for them).
 */

const ACTIVE_ELEMENTS =
  /<(script|iframe|frame|frameset|object|embed|applet|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const VOID_ACTIVE =
  /<\/?(?:script|iframe|frame|frameset|object|embed|applet|base|meta|link|form|input|button|select|option|textarea|noscript|template|portal)\b[^>]*>/gi;
const EVENT_ATTR = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
// srcset goes too: a browser prefers it over src, and only src is proxied.
const TARGET_ATTR =
  /\s+(?:target|formaction|srcdoc|ping|srcset)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URL_ATTR =
  /(\s(?:href|src|background|action|poster|xlink:href)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const REMOTE_IMAGE =
  /<img\b[^>]*\ssrc\s*=\s*["']?\s*(?:https?:)?\/\/|\sbackground\s*=\s*["']?\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i;

// Browsers ignore whitespace and control characters inside a URL scheme
// ("java\tscript:"), so they're removed before checking it.
const CONTROL_OR_SPACE = new RegExp(
  `[\\s${String.fromCharCode(0)}-${String.fromCharCode(31)}]+`,
  "g",
);

/** Attribute values are entity-decoded by the browser ("&#106;avascript:"). */
function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16) % 0x110000),
    )
    .replace(/&#(\d+);?/g, (_, dec: string) =>
      String.fromCodePoint(Number(dec) % 0x110000),
    )
    .replace(/&colon;/gi, ":")
    .replace(/&(?:tab|newline);/gi, " ");
}

/** Only links and images that can't run anything. */
function safeUrl(value: string, attribute: string): string | null {
  const url = decodeEntities(value).trim().replace(CONTROL_OR_SPACE, "");
  if (/^(?:https?:|mailto:|tel:|cid:|#)/i.test(url) || url.startsWith("//")) return value;
  if (
    /^data:image\/(?:png|gif|jpe?g|webp);/i.test(url) &&
    /src|background/i.test(attribute)
  ) {
    return value;
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return value; // relative: harmless, resolves nowhere
  return null;
}

export interface CleanEmailHtml {
  html: string;
  remoteImages: boolean;
}

export function cleanEmailHtml(raw: string): CleanEmailHtml {
  let html = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(ACTIVE_ELEMENTS, "")
    .replace(VOID_ACTIVE, "")
    .replace(EVENT_ATTR, "")
    .replace(TARGET_ATTR, "")
    .replace(
      URL_ATTR,
      (match, prefix: string, dq?: string, sq?: string, bare?: string) => {
        const value = dq ?? sq ?? bare ?? "";
        const attribute = prefix.trim().replace(/\s*=$/, "");
        return safeUrl(value, attribute) === null ? `${prefix}"#"` : match;
      },
    )
    // CSS can't run script in modern browsers, but drop the legacy hooks.
    .replace(/expression\s*\(|-moz-binding|behavior\s*:/gi, "x")
    .replace(/url\(\s*["']?\s*javascript:[^)]*\)/gi, "none");
  // Our rel comes first, so it wins over any the email sets.
  html = html.replace(/<a\b/gi, '<a rel="noopener noreferrer nofollow"');
  return { html, remoteImages: REMOTE_IMAGE.test(html) };
}

/** Where remote email images are fetched from, on our own server. */
export const EMAIL_IMAGE_PROXY_PATH = "/admin/inbox/image";

/** What an attribute value means once the browser has decoded it. */
function attributeValue(value: string) {
  return decodeEntities(value)
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

/** The proxy URL for a remote image, or null when the value isn't one. */
function proxied(raw: string): string | null {
  const url = attributeValue(raw).replace(CONTROL_OR_SPACE, "");
  if (!/^(?:https?:)?\/\//i.test(url)) return null;
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  // encodeURIComponent leaves ! ' ( ) * alone; escaped too, the result is
  // safe inside a quoted attribute and an unquoted CSS url().
  const encoded = encodeURIComponent(absolute).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${EMAIL_IMAGE_PROXY_PATH}?url=${encoded}`;
}

const IMAGE_ATTR = /(\s(?:src|background)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const CSS_URL =
  /url\(\s*(?:"([^"]*)"|'([^']*)'|&quot;([\s\S]*?)&quot;|([^)'"\s]*))\s*\)/gi;

/**
 * Points every remote image (img src, background attributes, CSS url())
 * at our image proxy, so the sender's servers never see the admin's
 * browser: no IP address, no cookies, and nothing for them to block.
 */
export function proxyRemoteImages(html: string): string {
  return html
    .replace(
      IMAGE_ATTR,
      (match, prefix: string, dq?: string, sq?: string, bare?: string) => {
        const url = proxied(dq ?? sq ?? bare ?? "");
        return url ? `${prefix}"${url}"` : match;
      },
    )
    .replace(CSS_URL, (match, dq?: string, sq?: string, ent?: string, bare?: string) => {
      const url = proxied(dq ?? sq ?? ent ?? bare ?? "");
      return url ? `url(${url})` : match;
    });
}

/**
 * The complete document for the iframe's srcdoc. Its CSP blocks everything
 * except inline styles and embedded images. Once the admin chooses to load
 * images, remote ones are rewritten to our own proxy, which is the only
 * other place images may come from ('self'): never the sender's servers.
 */
export function emailDocument(html: string, { loadImages }: { loadImages: boolean }) {
  if (loadImages) html = proxyRemoteImages(html);
  const images = loadImages ? "'self' data: cid:" : "data: cid:";
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src ${images}`,
    "font-src data:",
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><meta name="color-scheme" content="light"><base target="_blank"><style>html,body{margin:0;padding:0;background:#fff;color:#111;}body{padding:12px;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow-wrap:anywhere;}a{color:#2563eb;}</style></head><body>${html}</body></html>`;
}
