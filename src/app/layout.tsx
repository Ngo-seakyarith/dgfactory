import type { Metadata } from "next";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import "./globals.css";
import { hasAppAccess } from "@/lib/auth";
import { getAuthenticatedCookieUser } from "@/lib/auth-production";
import { setRequestAuthUser } from "@/lib/request-scope";

export const metadata: Metadata = {
  title: "DG Academy AI Training Production Factory",
  description:
    "Generate training packages, pricing, commercial proposals, and client-ready exports for DG Academy.",
};

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Product", "/product"],
  ["ROI", "/roi-calculator"],
  ["Adaptive Growth", "/adaptive-growth/dashboard"],
  ["Pilot", "/pilot"],
  ["Clients", "/clients"],
  ["Pipeline", "/pipeline"],
  ["Delivery", "/delivery"],
  ["Knowledge", "/knowledge"],
  ["Quality", "/quality"],
  ["Evals", "/evals"],
  ["Security", "/security"],
  ["Approvals", "/approvals"],
  ["Loops", "/loops"],
  ["Improvements", "/improvements"],
  ["New Package", "/packages/new"],
  ["Saved Packages", "/packages"],
  ["Settings", "/settings"],
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = await getAuthenticatedCookieUser(cookieStore.toString());
  setRequestAuthUser(user);
  const pathname = headerStore.get("x-dg-pathname") ?? "";
  const isClientPortal = pathname.startsWith("/client-portal");
  const isAccessStatusPage =
    pathname.startsWith("/login") ||
    pathname === "/settings" ||
    pathname.startsWith("/unauthorized");

  if (!isClientPortal && !isAccessStatusPage && !hasAppAccess(user.role)) {
    redirect("/unauthorized");
  }

  const resolvedNavItems = hasAppAccess(user.role)
    ? [
        ...navItems.slice(0, 8),
        ["Prompts", "/admin/prompts"],
        ...navItems.slice(8),
      ]
    : navItems;

  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-[#07111f] text-slate-50">
          {isClientPortal ? null : (
            <header className="border-b border-white/10 bg-[#081525]/95">
              <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <Link href="/dashboard" className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                    DG Academy
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    AI Training Production Factory
                  </div>
                </Link>
                <nav className="flex flex-wrap gap-2">
                  {resolvedNavItems.map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-teal-300/40 hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
            </header>
          )}
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
