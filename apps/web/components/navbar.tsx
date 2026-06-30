import Link from "next/link";
import {
  BellIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";

import { logoutUser } from "@/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Navbar({
  workspaceName,
  role,
  alertCount,
  userEmail,
}: {
  workspaceName: string;
  role: string;
  alertCount: number;
  userEmail: string;
}) {
  return (
    <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
      <nav
        aria-label="Workspace navigation"
        className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-card lg:hidden">
            <LayoutDashboardIcon aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{workspaceName}</p>
              <Badge variant="outline">{role}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="hidden min-w-72 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
          <SearchIcon aria-hidden />
          <span>Search metrics, logs, sources</span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Dashboard">
            <Link href="/dashboard">
              <LayoutDashboardIcon />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Sources">
            <Link href="/sources">
              <DatabaseIcon />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href="/dashboard/settings">
              <SettingsIcon />
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <BellIcon data-icon="inline-start" />
            {alertCount}
          </Button>
          <form action={logoutUser}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOutIcon data-icon="inline-start" />
              Log out
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
