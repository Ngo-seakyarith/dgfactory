import { NextResponse, type NextRequest } from "next/server";

const publicPrefixes = [
  "/login",
  "/client-portal",
  "/api/auth",
  "/api/loops",
  "/_next",
];

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dg-pathname", request.nextUrl.pathname);

  const authRequired = process.env.DG_REQUIRE_AUTH === "true";
  const isPublic = publicPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const hasSupabaseToken =
    request.cookies.has("sb-access-token") ||
    request.cookies.has("sb-refresh-token") ||
    request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  const hasDevRole =
    !authRequired &&
    process.env.DG_DEV_ROLE_SESSION === "true" &&
    request.cookies.has("dg_role");

  if (authRequired && !isPublic && !hasSupabaseToken && !hasDevRole) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
