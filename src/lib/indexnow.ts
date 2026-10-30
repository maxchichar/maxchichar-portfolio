/**
 * IndexNow (https://www.indexnow.org) tells Bing — and through it DuckDuckGo,
 * Yahoo and Ecosia — plus Yandex, Seznam, Naver and Yep the moment a URL
 * changes, instead of waiting for the next crawl. Off unless INDEXNOW_KEY is
 * set; the key is served at /indexnow.txt to prove ownership of the host.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/indexnow.txt";

/** The spec allows 8–128 characters of a-z, A-Z, 0-9 and "-". */
export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * Builds the submission body for absolute site paths, or null when there is
 * nothing worth sending (no key, a local site URL, or no paths).
 */
export function buildIndexNowPayload(
  siteUrl: string,
  key: string | null,
  paths: string[],
): IndexNowPayload | null {
  if (!key) return null;
  let base: URL;
  try {
    base = new URL(siteUrl);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" || /^(localhost|127\.|0\.0\.0\.0)/.test(base.hostname)) {
    return null;
  }
  const urlList = [...new Set(paths.filter(Boolean).map((p) => new URL(p, base).href))];
  if (urlList.length === 0) return null;
  return {
    host: base.host,
    key,
    keyLocation: new URL(INDEXNOW_KEY_PATH, base).href,
    urlList,
  };
}
