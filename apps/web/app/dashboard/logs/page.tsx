import { LogsRoute } from "@/components/dashboard/sections";
import { getDashboardData, WorkspaceEmptyState } from "@/lib/dashboard-data";

export default async function DashboardLogsPage() {
  const data = await getDashboardData();

  if (!data) {
    return <WorkspaceEmptyState />;
  }

  return <LogsRoute data={data} />;
}
