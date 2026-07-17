import type { Metadata } from "next";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./globals.css";
import { AppProviders } from "@/app/providers";
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
  { label: "Dashboard", href: "/dashboard", section: "Workspace" },
  { label: "New Package", href: "/packages/new", section: "Training" },
  { label: "Saved Packages", href: "/packages", section: "Training" },
  { label: "Delivery", href: "/delivery", section: "Training" },
  { label: "New System Proposal", href: "/system-proposals/new", section: "Systems" },
  { label: "System Proposals", href: "/system-proposals", section: "Systems" },
  { label: "Clients", href: "/clients", section: "Business" },
  { label: "Pipeline", href: "/pipeline", section: "Business" },
  { label: "Knowledge", href: "/knowledge", section: "Reference" },
  { label: "Product", href: "/product", section: "Development" },
  { label: "ROI", href: "/roi-calculator", section: "Development" },
  { label: "Adaptive Growth", href: "/adaptive-growth/dashboard", section: "Development" },
  { label: "Pilot", href: "/pilot", section: "Control" },
  { label: "Quality", href: "/quality", section: "Control" },
  { label: "Evals", href: "/evals", section: "Control" },
  { label: "Approvals", href: "/approvals", section: "Control" },
  { label: "Loops", href: "/loops", section: "Control" },
  { label: "Improvements", href: "/improvements", section: "Control" },
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
    ? [
        ...navItems,
        { label: "Prompts", href: "/admin/prompts", section: "Control" },
      ]
    : [];

  return (
    <html lang="en" className="dark">
      <body>
        <AppProviders>
          <div className="min-h-screen bg-[#141816] text-stone-50">
            {isClientPortal ? (
              <main className="app-workspace min-h-screen px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">{children}</div>
              </main>
            ) : (
              <div className="min-h-screen lg:flex">
                <SidebarNavigation
                  items={resolvedNavItems}
                  isAuthenticated={Boolean(user?.userId)}
                />
                <main className="app-workspace min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
                  <div className="mx-auto max-w-[1480px]">{children}</div>
                </main>
              </div>
            )}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
