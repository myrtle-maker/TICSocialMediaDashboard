"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid3X3,
  BarChart3,
  Zap,
  Users,
  Settings,
  SlidersHorizontal,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "grid-3x3": Grid3X3,
  "bar-chart-3": BarChart3,
  zap: Zap,
  users: Users,
  settings: Settings,
  "sliders-horizontal": SlidersHorizontal,
  lightbulb: Lightbulb,
};

const navItems = [
  { href: "/", label: "Overview", icon: "layout-dashboard" },
  { href: "/insights", label: "Insights", icon: "lightbulb" },
  { href: "/platforms", label: "Platforms", icon: "grid-3x3" },
  { href: "/content", label: "Content", icon: "bar-chart-3" },
  { href: "/hooks", label: "Hooks", icon: "zap" },
  { href: "/audience", label: "Audience", icon: "users" },
  { href: "/accounts", label: "Accounts", icon: "settings" },
  { href: "/settings", label: "Settings", icon: "sliders-horizontal" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-zinc-200 bg-white transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-zinc-200 px-4 dark:border-zinc-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <BarChart3 className="h-4 w-4 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">TIC Insights</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Social Media Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <BarChart3 className="h-4 w-4 text-white dark:text-zinc-900" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Logout + Theme Toggle + Collapse */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
        <button
          onClick={handleLogout}
          className={cn(
            "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
