import "server-only";

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

import { fileTypeFromBuffer } from "file-type";

/**
 * Fetches a remote image from an opened email on the admin's behalf (like
 * Gmail's image proxy), so the sender sees our server instead of the
 * admin's browser, and the image arrives same-origin whatever the sender's
 * server thinks of hotlinking or CORP.
 *
 * Because it fetches URLs that strangers wrote, it is careful not to become
 * a way into private networks: only http(s) on the standard ports, every
 * address a hostname resolves to (checked at connect time, so DNS can't
 * change its answer in between) and every redirect must be public, and the
 * response must really be a raster image of bounded size.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

/** Raster formats an <img> can show. No SVG: it's a document, not a picture. */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/apng",
]);

export class EmailImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const blocked = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(address, prefix, "ipv6");
}

/** True for any address that isn't plainly on the public internet. */
export function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family !== 6) return true;
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) forms.
  const mapped = /^::(?:ffff:(?:0:)?)?(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped?.[1]) return blocked.check(mapped[1], "ipv4");
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hex?.[1] && hex[2]) {
    const n = (parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16);
    const v4 = [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
    return blocked.check(v4, "ipv4");
  }
  return blocked.check(address, "ipv6");
}

/** dns.lookup, refusing private answers; used as the socket's resolver. */
export const publicLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const [first] = list;
    if (!first || list.some((a) => isPrivateAddress(a.address))) {
      const error = Object.assign(new Error(`${hostname} is not a public address`), {
        code: "EPRIVATE",
      });
      return callback(error, "", 4);
    }
    if ((options as dns.LookupOptions).all) return callback(null, list as never);
    callback(null, first.address, first.family);
  });
};

/** Parses and vets a URL before anything connects to it. */
export function checkImageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EmailImageError("Not a URL", 400);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EmailImageError("Only http(s) images", 400);
  }
  if (url.username || url.password) {
    throw new EmailImageError("No credentials in image URLs", 400);
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new EmailImageError("Only standard ports", 400);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  // Sockets skip the resolver for IP literals, so check those here.
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new EmailImageError("Not a public address", 400);
  }
  if (
    !net.isIP(host) &&
    (!host.includes(".") || /\.(?:local|internal|localhost)$/i.test(host))
  ) {
    throw new EmailImageError("Not a public host", 400);
  }
  return url;
}

interface Fetched {
  status: number;
  location?: string;
  contentType?: string;
  body: Buffer;
}

function get(url: URL): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        lookup: publicLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EmailImageProxy/1.0)",
          Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume();
          return resolve({
            status,
            location: response.headers.location,
            body: Buffer.alloc(0),
          });
        }
        const declared = Number(response.headers["content-length"]);
        if (declared > MAX_IMAGE_BYTES) {
          response.destroy();
          return reject(new EmailImageError("Image too large", 413));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy();
            reject(new EmailImageError("Image too large", 413));
          } else {
            chunks.push(chunk);
          }
        });
        response.on("end", () =>
          resolve({
            status,
            contentType: response.headers["content-type"],
            body: Buffer.concat(chunks),
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new EmailImageError("Timed out", 504)));
    request.on("error", (err: NodeJS.ErrnoException) =>
      reject(
        err instanceof EmailImageError
          ? err
          : new EmailImageError(
              err.code === "EPRIVATE"
                ? "Not a public address"
                : "Couldn't reach the image",
              err.code === "EPRIVATE" ? 400 : 502,
            ),
      ),
    );
  });
}

/** Fetches an email image, following redirects only to public addresses. */
export async function fetchEmailImage(
  value: string,
): Promise<{ type: string; body: Buffer }> {
  let url = checkImageUrl(value);
  for (let hop = 0; ; hop++) {
    const response = await get(url);
    if (response.location !== undefined) {
      if (hop >= MAX_REDIRECTS) throw new EmailImageError("Too many redirects", 502);
      url = checkImageUrl(new URL(response.location, url).href);
      continue;
    }
    if (response.status !== 200) {
      throw new EmailImageError(`Image server answered ${response.status}`, 502);
    }
    // Trust the bytes, not the header: many mail servers say octet-stream.
    const sniffed = await fileTypeFromBuffer(response.body);
    const type =
      sniffed?.mime ?? response.contentType?.split(";")[0]?.trim().toLowerCase();
    if (!type || !IMAGE_TYPES.has(type) || (sniffed && !IMAGE_TYPES.has(sniffed.mime))) {
      throw new EmailImageError("Not an image", 415);
    }
    return { type, body: response.body };
  }
}
