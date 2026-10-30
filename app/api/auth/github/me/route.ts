import { NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";

export async function GET() {
  const player = await getPlayerSession();
  return NextResponse.json({ player });
}

