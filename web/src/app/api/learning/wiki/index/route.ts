import { NextRequest, NextResponse } from "next/server";

const LEARNING_URL =
  process.env.LEARNING_SERVICE_URL ?? "http://learning_service:8001";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const user_id = searchParams.get("user_id") ?? "default";
  const workspace_id = searchParams.get("workspace_id") ?? "default";
  const refresh = searchParams.get("refresh") ?? "false";

  try {
    const res = await fetch(
      `${LEARNING_URL}/tools/wiki/index?user_id=${user_id}&workspace_id=${workspace_id}&refresh=${refresh}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach learning service", detail: String(err) },
      { status: 502 }
    );
  }
}
