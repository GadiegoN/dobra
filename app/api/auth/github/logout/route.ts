import { NextResponse } from "next/server";
import { clearPlayerSession } from "@/lib/auth";

export async function POST() {
  await clearPlayerSession();
  return NextResponse.json({ success: true });
}

