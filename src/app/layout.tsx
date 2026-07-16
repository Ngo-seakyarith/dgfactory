import type { Metadata } from "next";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./globals.css";
import { SidebarNavigation, type SidebarItem } from "@/components/sidebar-navigation";
import { hasAppAccess } from "@/lib/auth";
import { getAuthenticatedCookieUser } from "@/lib/auth-production";
import { setRequestAuthUser } from "@/lib/request-scope";

export const metadata: Metadata = {
  title: "DG Academy AI Training Production Factory",
  description:
    "Generate training packages, pricing, commercial proposals, and client-ready exports for DG Academy.",
};

const navItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "New Package", href: "/packages/new" },
  { label: "Saved Packages", href: "/packages" },
  { label: "New System Proposal", href: "/system-proposals/new" },
  { label: "System Proposals", href: "/system-proposals" },
  { label: "Clients", href: "/clients" },
  { label: "Product", href: "/product" },
  { label: "ROI", href: "/roi-calculator" },
  { label: "Adaptive Growth", href: "/adaptive-growth/dashboard" },
  { label: "Pilot", href: "/pilot" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Delivery", href: "/delivery" },
  { label: "Knowledge", href: "/knowledge" },
  { label: "Quality", href: "/quality" },
  { label: "Evals", href: "/evals" },
  { label: "Approvals", href: "/approvals" },
  { label: "Loops", href: "/loops" },
  { label: "Improvements", href: "/improvements" },
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
    pathname.startsWith("/unauthorized");

  if (!isClientPortal && !isAccessStatusPage && !user) {
    redirect("/login");
  }

  if (!isClientPortal && !isAccessStatusPage && user && !hasAppAccess(user.role)) {
    redirect("/unauthorized");
  }

  const resolvedNavItems = user && hasAppAccess(user.role)
    ? (() => {
        const deliveryIndex = navItems.findIndex((item) => item.href === "/delivery") + 1;
        return [
          ...navItems.slice(0, deliveryIndex),
          { label: "Prompts", href: "/admin/prompts" },
          ...navItems.slice(deliveryIndex),
        ];
      })()
    : [];

  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-[#07111f] text-slate-50">
          {isClientPortal ? (
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          ) : (
            <div className="min-h-screen lg:flex">
              <SidebarNavigation
                items={resolvedNavItems}
                isAuthenticated={Boolean(user?.userId)}
              />
              <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">{children}</div>
              </main>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
