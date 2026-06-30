"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  GaugeIcon,
  GripVerticalIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const expandedMin = 232;
const expandedMax = 360;
const collapsedWidth = 76;

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3Icon,
  },
  {
    label: "Logs",
    href: "/dashboard/logs",
    icon: ListChecksIcon,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: SettingsIcon,
  },
  {
    label: "Sources",
    href: "/sources",
    icon: DatabaseIcon,
  },
];

function clampWidth(value: number) {
  return Math.min(expandedMax, Math.max(expandedMin, value));
}

export function Sidebar({
  workspaceName,
  workspaceSlug,
  activeSources,
  totalSources,
}: {
  workspaceName: string;
  workspaceSlug: string;
  activeSources: number;
  totalSources: number;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(280);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem("dikana-sidebar-width");
    const savedCollapsed = window.localStorage.getItem(
      "dikana-sidebar-collapsed",
    );

    if (savedWidth) {
      setWidth(clampWidth(Number(savedWidth)));
    }

    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dikana-sidebar-width", String(width));
  }, [width]);

  useEffect(() => {
    window.localStorage.setItem(
      "dikana-sidebar-collapsed",
      String(isCollapsed),
    );
  }, [isCollapsed]);

  const navItems = useMemo(
    () =>
      navigation.map((item) => ({
        ...item,
        isActive:
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`),
      })),
    [pathname],
  );

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    if (isCollapsed) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;

    function onPointerMove(moveEvent: PointerEvent) {
      setWidth(clampWidth(startWidth + moveEvent.clientX - startX));
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <aside
      aria-label="Primary navigation"
      className="sticky top-0 hidden h-svh shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex"
      style={{ width: isCollapsed ? collapsedWidth : width }}
    >
      <div className="relative flex w-full flex-col gap-6 px-3 py-5">
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between gap-3",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center gap-3",
              isCollapsed && "justify-center",
            )}
            aria-label={workspaceName}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GaugeIcon aria-hidden />
            </div>
            {!isCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{workspaceName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /{workspaceSlug}
                </p>
              </div>
            ) : null}
          </Link>

          {!isCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Collapse sidebar"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeftIcon />
            </Button>
          ) : null}
        </div>

        <nav className="flex flex-col gap-1" aria-label="Dashboard sections">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "justify-center px-2",
                item.isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon aria-hidden />
              {!isCollapsed ? <span>{item.label}</span> : null}
            </Link>
          ))}
        </nav>

        <div
          className={cn(
            "mt-auto flex flex-col gap-4 rounded-lg border bg-background/40 p-4",
            isCollapsed && "items-center p-3",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed ? "flex-col" : "justify-between",
            )}
          >
            <div className="flex items-center gap-2">
              <ShieldCheckIcon aria-hidden />
              {!isCollapsed ? (
                <span className="text-sm font-medium">Source health</span>
              ) : null}
            </div>
            <Badge
              variant={activeSources === totalSources ? "secondary" : "outline"}
            >
              {activeSources}/{totalSources}
            </Badge>
          </div>
          {!isCollapsed ? (
            <p className="text-xs text-muted-foreground">
              Operational navigation for analytics, ingestion, and workspace
              controls.
            </p>
          ) : null}
        </div>

        {isCollapsed ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Expand sidebar"
            className="mx-auto"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRightIcon />
          </Button>
        ) : null}

        {!isCollapsed ? (
          <button
            type="button"
            aria-label="Resize sidebar"
            className="absolute right-0 top-0 flex h-full translate-x-1/2 cursor-col-resize items-center justify-center px-1 text-muted-foreground hover:text-foreground"
            onPointerDown={startResize}
          >
            <GripVerticalIcon aria-hidden />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
