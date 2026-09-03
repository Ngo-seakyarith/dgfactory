import type { Metadata } from "next";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./globals.css";
import { AppProviders } from "@/app/providers";
import { COLLAPSED_COOKIE, SidebarNavigation, type SidebarItem } from "@/components/sidebar-navigation";
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
  { label: "Training Packages", href: "/packages", section: "Training" },
  { label: "Syllabus Imports", href: "/packages/from-syllabus", section: "Training" },
  { label: "Delivery", href: "/delivery", section: "Training" },
  { label: "Solution Proposals", href: "/solution-proposals", section: "Systems" },
  { label: "Clients", href: "/clients", section: "Business" },
  { label: "Pipeline", href: "/pipeline", section: "Business" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = await getAuthenticatedCookieUser(cookieStore.toString());
  setRequestAuthUser(user);
  const pathname = headerStore.get("x-dg-pathname") ?? "";
  const railCollapsed = cookieStore.get(COLLAPSED_COOKIE)?.value === "1";
  const isPublicForm = pathname.startsWith("/evaluate");
  const isPublicPage = isPublicForm;
  const isAccessStatusPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/unauthorized");

  if (!isPublicPage && !isAccessStatusPage && !user) {
    redirect("/login");
  }

  if (!isPublicPage && !isAccessStatusPage && user && !hasAppAccess(user.role)) {
    redirect("/unauthorized");
  }

  const resolvedNavItems = user && hasAppAccess(user.role) ? navItems : [];

  return (
    <html lang="en" className="dark" data-rail={railCollapsed ? "collapsed" : "expanded"}>
      <body>
        <AppProviders>
          <div className="min-h-screen bg-[#141816] text-stone-50">
            {isPublicPage ? (
              <main className="app-workspace min-h-screen px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">{children}</div>
              </main>
            ) : (
              // The workspace ground runs behind the rail too, so the dark panel
              // floats on the light field rather than on a dark frame.
              <div className="min-h-screen bg-[#f2f4f1] lg:flex">
                <SidebarNavigation
                  items={resolvedNavItems}
                  isAuthenticated={Boolean(user?.userId)}
                  defaultCollapsed={railCollapsed}
                />
                <main className="app-workspace min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
                  <div className="app-shell">{children}</div>
                </main>
              </div>
            )}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
