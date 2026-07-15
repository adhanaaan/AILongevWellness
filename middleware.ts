import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal shared-password gate for the public demo deployment. Set
 * SITE_AUTH_PASSWORD in the Vercel project's environment variables to turn
 * it on; leave it unset (e.g. local dev) and the gate is skipped entirely.
 */
export function middleware(request: NextRequest) {
  const password = process.env.SITE_AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  const username = process.env.SITE_AUTH_USER || "aiwellness";
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);
    if (user === username && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Wellness", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
