"use client";

import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";

export default function AnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["coordinator", "sys_admin"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Institutional insights and performance metrics
          </p>
        </div>

        <KpiCards />
        <AnalyticsCharts />
      </div>
    </RoleGuard>
  );
}
