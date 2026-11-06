import { auth } from "@/lib/auth/config";
import { EmailImageError, fetchEmailImage } from "@/server/services/email-image-proxy";

// Remote images in opened emails, fetched by our server (see
// src/lib/email-html.ts, which points them here). Route handlers aren't
// wrapped by the (protected) layout, so this checks the session itself.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (message: string, status: number) =>
  new Response(message, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return fail("Not authenticated", 401);

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return fail("Missing url", 400);

  try {
    const image = await fetchEmailImage(url);
    return new Response(new Uint8Array(image.body), {
      headers: {
        "Content-Type": image.type,
        "Content-Length": String(image.body.length),
        // Only this admin's browser keeps it; emails don't change.
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    if (err instanceof EmailImageError) return fail(err.message, err.status);
    console.error("email image proxy:", err);
    return fail("Couldn't load the image", 502);
  }
}
