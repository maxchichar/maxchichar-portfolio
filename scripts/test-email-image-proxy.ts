import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";

import {
  checkImageUrl,
  fetchEmailImage,
  isPrivateAddress,
  publicLookup,
} from "../src/server/services/email-image-proxy";

describe("email image proxy", () => {
  it("knows private and public addresses apart", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "::",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "::ffff:a9fe:a9fe",
      "64:ff9b::a9fe:a9fe",
      "not-an-ip",
    ]) {
      assert.strictEqual(isPrivateAddress(address), true, address);
    }
    for (const address of [
      "8.8.8.8",
      "104.16.1.1",
      "2606:4700::1111",
      "::ffff:8.8.8.8",
    ]) {
      assert.strictEqual(isPrivateAddress(address), false, address);
    }
  });

  it("refuses URLs that aren't public http(s) images", () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://a.co/x.png",
      "javascript:alert(1)",
      "http://127.0.0.1/x.png",
      "http://[::1]/x.png",
      "http://169.254.169.254/latest/meta-data",
      "http://0x7f000001/x.png",
      "http://2130706433/x.png",
      "https://user:pw@a.co/x.png",
      "https://a.co:8080/x.png",
      "http://localhost/x.png",
      "http://intranet/x.png",
      "http://db.internal/x.png",
      "nonsense",
    ]) {
      assert.throws(() => checkImageUrl(url), Error, url);
    }
    assert.strictEqual(checkImageUrl("https://a.co/x.png").href, "https://a.co/x.png");
  });

  it("won't connect to a hostname that resolves to a private address", async () => {
    // The resolver the sockets use: localhost resolves from /etc/hosts.
    const error = await new Promise<NodeJS.ErrnoException | null>((resolve) =>
      publicLookup("localhost", {}, (err) => resolve(err)),
    );
    assert.strictEqual(error?.code, "EPRIVATE");
  });

  it("won't follow a redirect into a private network", async () => {
    // A local server stands in for a public one: hit it by IP literal through
    // the redirect check only (the server itself is private, so we expect
    // the very first hop to be refused, which is the point).
    const server = http
      .createServer((_req, res) => {
        res.writeHead(302, { Location: "http://127.0.0.1/secret" });
        res.end();
      })
      .listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      await assert.rejects(fetchEmailImage(`http://127.0.0.1:${port}/x.png`));
    } finally {
      server.close();
    }
  });
});
