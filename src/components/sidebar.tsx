"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

const workstreamLinks = [
  { href: "/workstreams/connectors", label: "Connectors" },
  { href: "/workstreams/kit-applications", label: "Kit Applications" },
  { href: "/workstreams/web-platform", label: "Web Platform" },
  { href: "/workstreams/artificial-intelligence", label: "Artificial Intelligence" },
  { href: "/workstreams/omniverse-cloud", label: "Omniverse Cloud" },
  { href: "/workstreams/devsecops-infra", label: "DevSecOps / Infra" },
  { href: "/workstreams/internal-tools-apps", label: "Internal Tools & Apps" },
  { href: "/workstreams/mirsee-humanoid", label: "Mirsee Humanoid Robot" },
];

const docsLinks = [
  { href: "/docs/agile-estimation", label: "Agile Estimation" },
];

const navItems = [
  { href: "/my-dashboard", label: "My Dashboard", icon: "👤" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/roadmap", label: "Roadmap (FY26–FY28)", icon: "🗺️" },
  { href: "/burndown", label: "Burndown", icon: "📉" },
  { href: "/workstreams", label: "Workstreams", icon: "⚡", children: workstreamLinks },
  { href: "/open-issues", label: "Open Issues", icon: "🚩" },
  { href: "/deliverables", label: "Deliverables", icon: "📦" },
  { href: "/partners", label: "Partners", icon: "🤝" },
  { href: "/people", label: "People", icon: "👥" },
  { href: "/docs", label: "Documentation", icon: "📖", children: docsLinks },
  { href: "/admin", label: "Admin", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [wsOpen, setWsOpen] = useState(pathname?.startsWith("/workstreams") || false);
  const [docsOpen, setDocsOpen] = useState(pathname?.startsWith("/docs") || false);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card overflow-y-auto">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg">
          <span className="text-base">🧠</span>
          <span>Project Neuron</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/workstreams" && item.href !== "/docs" && pathname?.startsWith(item.href));
          const hasChildren = !!item.children;
          const isWs = item.href === "/workstreams";
          const isDocs = item.href === "/docs";
          const childActive = pathname?.startsWith(item.href);

          if (hasChildren) {
            const isOpen = isWs ? wsOpen : isDocs ? docsOpen : false;
            const toggle = isWs
              ? () => setWsOpen(!wsOpen)
              : isDocs
              ? () => setDocsOpen(!docsOpen)
              : () => {};
            const links = item.children!;

            return (
              <div key={item.href}>
                <button
                  onClick={toggle}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    childActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-xs text-muted-foreground/60">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="ml-8 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
                    {links.map((child) => {
                      const childItemActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                            childItemActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
