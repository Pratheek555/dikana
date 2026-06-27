DROP POLICY IF EXISTS "user_tenant_access_Tenant" ON "Tenant";
DROP POLICY IF EXISTS "user_tenant_access_TenantMembership" ON "TenantMembership";
DROP POLICY IF EXISTS "tenant_isolation_DataSource" ON "DataSource";
DROP POLICY IF EXISTS "tenant_isolation_DataSourceMapping" ON "DataSourceMapping";
DROP POLICY IF EXISTS "tenant_isolation_WebhookEndpoint" ON "WebhookEndpoint";
DROP POLICY IF EXISTS "tenant_isolation_Metric" ON "Metric";
DROP POLICY IF EXISTS "tenant_isolation_RawEvent" ON "RawEvent";
DROP POLICY IF EXISTS "tenant_isolation_MetricPoint" ON "MetricPoint";
DROP POLICY IF EXISTS "tenant_isolation_IngestionRun" ON "IngestionRun";
DROP POLICY IF EXISTS "tenant_isolation_IngestionError" ON "IngestionError";
DROP POLICY IF EXISTS "tenant_isolation_Dashboard" ON "Dashboard";
DROP POLICY IF EXISTS "tenant_isolation_DashboardWidget" ON "DashboardWidget";
DROP POLICY IF EXISTS "tenant_isolation_DashboardWidgetMetric" ON "DashboardWidgetMetric";
DROP POLICY IF EXISTS "tenant_isolation_EmbedConfig" ON "EmbedConfig";
DROP POLICY IF EXISTS "tenant_isolation_EmbedAllowedDomain" ON "EmbedAllowedDomain";
DROP POLICY IF EXISTS "tenant_isolation_EmbedVisibleMetric" ON "EmbedVisibleMetric";
DROP POLICY IF EXISTS "tenant_isolation_ApiKey" ON "ApiKey";
DROP POLICY IF EXISTS "tenant_isolation_AnomalyEvent" ON "AnomalyEvent";
DROP POLICY IF EXISTS "tenant_isolation_AlertDelivery" ON "AlertDelivery";

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_tenant_access_Tenant"
ON "Tenant"
FOR ALL
USING (
  "ownerId" = current_setting('app.current_user_id', true)
  OR "id" = current_setting('app.current_tenant_id', true)
)
WITH CHECK (
  "ownerId" = current_setting('app.current_user_id', true)
  OR "id" = current_setting('app.current_tenant_id', true)
);

ALTER TABLE "TenantMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_tenant_access_TenantMembership"
ON "TenantMembership"
FOR ALL
USING (
  "userId" = current_setting('app.current_user_id', true)
  OR "tenantId" = current_setting('app.current_tenant_id', true)
)
WITH CHECK (
  "userId" = current_setting('app.current_user_id', true)
  OR "tenantId" = current_setting('app.current_tenant_id', true)
);

ALTER TABLE "DataSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataSource" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DataSource"
ON "DataSource"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "DataSourceMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataSourceMapping" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DataSourceMapping"
ON "DataSourceMapping"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "WebhookEndpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEndpoint" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_WebhookEndpoint"
ON "WebhookEndpoint"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Metric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Metric" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Metric"
ON "Metric"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "RawEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RawEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_RawEvent"
ON "RawEvent"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "MetricPoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetricPoint" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_MetricPoint"
ON "MetricPoint"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "IngestionRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IngestionRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_IngestionRun"
ON "IngestionRun"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "IngestionError" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IngestionError" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_IngestionError"
ON "IngestionError"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "Dashboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dashboard" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Dashboard"
ON "Dashboard"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "DashboardWidget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DashboardWidget" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DashboardWidget"
ON "DashboardWidget"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "DashboardWidgetMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DashboardWidgetMetric" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_DashboardWidgetMetric"
ON "DashboardWidgetMetric"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "EmbedConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmbedConfig" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_EmbedConfig"
ON "EmbedConfig"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "EmbedAllowedDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmbedAllowedDomain" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_EmbedAllowedDomain"
ON "EmbedAllowedDomain"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "EmbedVisibleMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmbedVisibleMetric" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_EmbedVisibleMetric"
ON "EmbedVisibleMetric"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ApiKey"
ON "ApiKey"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AnomalyEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnomalyEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AnomalyEvent"
ON "AnomalyEvent"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AlertDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_AlertDelivery"
ON "AlertDelivery"
FOR ALL
USING ("tenantId" = current_setting('app.current_tenant_id', true))
WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
