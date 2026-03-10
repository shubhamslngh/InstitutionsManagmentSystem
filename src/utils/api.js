import { NextResponse } from "next/server";

export function success(data, init = {}) {
  return NextResponse.json({ data }, init);
}

export function created(message, data) {
  return NextResponse.json({ message, data }, { status: 201 });
}

export function failure(error) {
  const status = error.status || 500;

  return NextResponse.json(
    {
      message: error.message || "Internal server error.",
      details: error.details || null
    },
    { status }
  );
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
