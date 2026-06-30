import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import {
  getDashboardShellData,
  humanize,
  WorkspaceEmptyState,
} from "@/lib/dashboard-data";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getDashboardShellData();

  if (!data) {
    return <WorkspaceEmptyState />;
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh">
        <Sidebar
          workspaceName={data.membership.tenant.name}
          workspaceSlug={data.membership.tenant.slug}
          activeSources={data.activeSourceCount}
          totalSources={data.dataSourceCount}
        />

        <div className="min-w-0 flex-1">
          <Navbar
            workspaceName={data.membership.tenant.name}
            role={humanize(data.membership.role)}
            alertCount={data.pendingAlertCount}
            userEmail={data.user.email}
          />

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
