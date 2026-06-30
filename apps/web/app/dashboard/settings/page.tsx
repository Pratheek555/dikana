import { SettingsRoute } from "@/components/dashboard/sections";
import { getDashboardData, WorkspaceEmptyState } from "@/lib/dashboard-data";

export default async function DashboardSettingsPage() {
  const data = await getDashboardData();

  if (!data) {
    return <WorkspaceEmptyState />;
  }

  return <SettingsRoute data={data} />;
}
