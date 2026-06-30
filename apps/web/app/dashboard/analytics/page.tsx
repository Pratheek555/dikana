import { AnalyticsRoute } from "@/components/dashboard/sections";
import { getDashboardData, WorkspaceEmptyState } from "@/lib/dashboard-data";

export default async function DashboardAnalyticsPage() {
  const data = await getDashboardData();

  if (!data) {
    return <WorkspaceEmptyState />;
  }

  return <AnalyticsRoute data={data} />;
}
