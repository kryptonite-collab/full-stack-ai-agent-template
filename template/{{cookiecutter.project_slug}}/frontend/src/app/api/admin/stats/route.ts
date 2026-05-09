import { NextResponse } from "next/server";

import { BackendApiError, backendFetch } from "@/lib/server-api";

export async function GET() {
  try {
    const data = await backendFetch<unknown>("/api/v1/admin/stats");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
