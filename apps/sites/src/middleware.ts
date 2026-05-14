import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Reads the Host header and routes to the right gym's data
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0] ?? "";

  const url = request.nextUrl.clone();
  url.searchParams.set("domain", hostname);

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
