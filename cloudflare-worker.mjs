import worker from "./.open-next/worker.js";
import { isStaticShareImage } from "./src/lib/cloudflare-static.ts";
import { createRequestDatabase, databaseScope } from "./src/lib/db/request.ts";

const portfolioWorker = {
  async fetch(request, env, ctx) {
    if (isStaticShareImage(request)) {
      const assetUrl = new URL("/og-default.png", request.url);
      return env.ASSETS.fetch(new Request(assetUrl, { method: request.method }));
    }
    const scoped = createRequestDatabase(env.DATABASE_URL);
    if (!scoped) return worker.fetch(request, env, ctx);
    return databaseScope.run(scoped.database, async () => {
      try {
        const response = await worker.fetch(request, env, ctx);
        if (!response.body) {
          ctx.waitUntil(scoped.close());
          return response;
        }
        // Next streams responses. Keep its request's connections alive until
        // the entire body finishes (or is cancelled), then release the pool.
        const { readable, writable } = new TransformStream();
        ctx.waitUntil(
          response.body
            .pipeTo(writable)
            .catch(() => {})
            .finally(scoped.close),
        );
        return new Response(readable, response);
      } catch (error) {
        ctx.waitUntil(scoped.close());
        throw error;
      }
    });
  },
};

export default portfolioWorker;
