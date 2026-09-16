import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/config";
import * as mediaService from "@/server/services/media";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const media = await mediaService.confirmUpload(id);
    return NextResponse.json({ media });
  } catch (err) {
    if (err instanceof mediaService.MediaServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Confirm failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
