import { neonConfig } from "@neondatabase/serverless";
import ws, { type ClientOptions } from "ws";

/**
 * Node.js on systems without global IPv6 routing (e.g. Linux containers, dev
 * sandboxes, or WSL) can fail or time out with ETIMEDOUT when trying to connect
 * because happy-eyeballs (autoSelectFamily) tries unreachable IPv6 addresses.
 *
 * Subclassing `ws` to force `family: 4` ensures WebSocket connections connect
 * immediately over IPv4.
 */
export class IPv4WebSocket extends ws {
  constructor(
    address: string | URL,
    protocols?: string | string[] | ClientOptions,
    options?: ClientOptions,
  ) {
    if (typeof protocols === "object" && !Array.isArray(protocols) && protocols !== null) {
      options = protocols;
      protocols = undefined;
    }
    super(address, protocols, { ...options, family: 4 });
  }
}

let configured = false;

export function configureNeon() {
  if (configured) return;
  configured = true;

  neonConfig.webSocketConstructor = IPv4WebSocket;
  neonConfig.poolQueryViaFetch = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Agent } = require("undici");
    const ipv4Agent = new Agent({ connect: { family: 4 } });
    neonConfig.fetchFunction = (url: string | URL | Request, init?: RequestInit) =>
      fetch(url, { ...init, dispatcher: ipv4Agent } as RequestInit);
  } catch {
    // Keep default fetchFunction if undici Agent is unavailable
  }
}
