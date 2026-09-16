import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/config";
import { uploadRequestSchema } from "@/lib/validation/media";
import * as mediaService from "@/server/services/media";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = await mediaService.requestUpload(parsed.data, { id: session.user.id });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
