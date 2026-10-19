// Workers Free uses the existing branded share card instead of CPU-heavy
// dynamic PNG rendering. Match public metadata endpoints only.
export function isStaticShareImage(request: Request): boolean {
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    /^\/(?:opengraph-image|(?:about|now|contact|work|research|writing|topics)(?:\/[^/]+)?\/opengraph-image)$/.test(
      new URL(request.url).pathname,
    )
  );
}
