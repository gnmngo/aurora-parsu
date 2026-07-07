"use client";

import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { KpiCards } from "@/components/dashboard/kpi-cards";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Institutional insights and performance metrics
        </p>
      </div>

      <KpiCards />
      <AnalyticsCharts />
    </div>
  );
}
