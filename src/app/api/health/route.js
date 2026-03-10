import { NextResponse } from "next/server";
import { ensureSchema } from "../../../db/ensureSchema.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    return NextResponse.json({
      status: "ok",
      service: "maurya-school-management",
      framework: "nextjs",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message
      },
      { status: 500 }
    );
  }
}
