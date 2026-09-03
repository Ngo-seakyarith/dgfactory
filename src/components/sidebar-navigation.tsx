"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Archive,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  FileCog,
  FileInput,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { AccountButton, type SidebarAccount } from "@/components/account-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  label: string;
  href: string;
  section?: string;
};

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Clients: Building2,
  Pipeline: BriefcaseBusiness,
  Delivery: CalendarCheck,
  "Training Packages": Archive,
  "Syllabus Imports": FileInput,
  "Solution Proposals": FileCog,
};

export const COLLAPSED_COOKIE = "sidebar-collapsed";

type SidebarNavigationProps = {
  items: SidebarItem[];
  isAuthenticated: boolean;
  defaultCollapsed?: boolean;
  account?: SidebarAccount;
};

export function SidebarNavigation({
  items,
  isAuthenticated,
  defaultCollapsed = false,
  account,
}: SidebarNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const activeHref = useMemo(
    () =>
      items.reduce<string | null>((current, item) => {
        const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return matches && (!current || item.href.length > current.length) ? item.href : current;
      }, null),
    [items, pathname],
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next);
    // The workspace reads the reclaimed width off the root element, and the cookie
    // lets the server render the rail at the width it was left at.
    document.documentElement.dataset.rail = next ? "collapsed" : "expanded";
    document.cookie = `${COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  // Collapsed, the rail itself is the expand affordance. Links and buttons keep
  // their own behaviour, so only the empty parts of the panel toggle it back.
  const expandRail = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!isCollapsed) return;
      if (event.target instanceof Element && event.target.closest("a, button")) return;
      setCollapsed(false);
    },
    [isCollapsed, setCollapsed],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, SidebarItem[]>();
    for (const item of items) {
      const section = item.section ?? "Workspace";
      grouped.set(section, [...(grouped.get(section) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [items]);

  const renderNavigation = (collapsed: boolean) => (
    <>
      <div
        className={cn(
          "flex h-[88px] items-center justify-between border-b border-white/10 px-4",
          collapsed && "px-0",
        )}
      >
        {collapsed ? (
          // The mark doubles as the expand control and reveals the panel icon on
          // hover, so the rail needs no permanent toggle taking up its width.
          <button
            type="button"
            className="group grid h-full w-full cursor-pointer place-items-center"
            onClick={() => setCollapsed(false)}
            title="Expand navigation"
            aria-label="Expand navigation"
            aria-expanded={false}
          >
            <span className="relative grid h-10 w-10 place-items-center">
              <Image
                src="/app-logo.png"
                alt="DG Academy"
                width={40}
                height={40}
                className="h-10 w-10 rounded-sm object-cover transition-opacity group-hover:opacity-0"
                priority
                unoptimized
              />
              <PanelLeftOpen className="absolute h-5 w-5 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </button>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-3"
              onClick={() => setIsOpen(false)}
            >
              <Image
                src="/app-logo.png"
                alt="DG Academy"
                width={40}
                height={40}
                className="h-10 w-10 rounded-sm object-cover"
                priority
                unoptimized
              />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-semibold uppercase text-[#f4772e]">
                  DG Academy
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-stone-50">
                  Production Factory
                </div>
              </div>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
              title="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed(true)}
              title="Collapse navigation"
              aria-label="Collapse navigation"
              aria-expanded
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      <nav
        className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-4", collapsed && "px-2")}
        aria-label="Primary navigation"
      >
        {items.length ? (
          <div className="space-y-5">
            {groups.map(([section, sectionItems], index) => (
              <div
                key={section}
                // Section headings do not fit the rail, so a rule keeps the grouping
                // readable in their place.
                className={cn(collapsed && index > 0 && "border-t border-white/10 pt-4")}
              >
                {collapsed ? null : (
                  <div className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase text-stone-500">
                    {section}
                  </div>
                )}
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = icons[item.label] ?? Sparkles;
                    const isActive = activeHref === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "relative flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                          collapsed && "justify-center gap-0 px-0",
                          isActive
                            ? "bg-white/[0.08] text-stone-50 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:bg-[#f4772e]"
                            : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-50",
                        )}
                      >
                        <Icon
                          className={cn(
                            // In the rail the icon carries the whole label, so it
                            // grows to fill the space the text left behind.
                            "shrink-0",
                            collapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                            isActive && "text-[#f4772e]",
                          )}
                        />
                        {collapsed ? null : <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </nav>

      <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
        <AccountButton isAuthenticated={isAuthenticated} account={account} collapsed={collapsed} />
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#141816]/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <Image src="/app-logo.png" alt="DG Academy" width={32} height={32} className="h-8 w-8 rounded-sm object-cover" unoptimized />
          <div>
            <div className="font-mono text-[9px] font-semibold uppercase text-[#f4772e]">DG Academy</div>
            <div className="truncate text-sm font-semibold text-stone-50">Production Factory</div>
          </div>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          title="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <aside
        className={cn(
          "sticky top-2 z-30 m-2 mr-0 hidden h-[calc(100vh-1rem)] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141816] shadow-2xl shadow-black/25 transition-[width] duration-200 ease-out lg:flex",
          isCollapsed ? "w-[76px] cursor-pointer" : "w-[272px]",
        )}
        onClick={expandRail}
      >
        {renderNavigation(isCollapsed)}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-[min(300px,88vw)] flex-col border-r border-white/10 bg-[#141816] shadow-2xl">
            {renderNavigation(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
