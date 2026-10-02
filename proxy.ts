import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(
    "x-co-locale",
    req.nextUrl.pathname.startsWith("/en/") ? "en" : "pt-BR",
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next|media|favicon).*)"],
};
