"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import {
  fetchAnalyticsData,
  type AnalyticsDataset,
} from "@/lib/analytics/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function EmptyChart({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <Inbox className="mb-3 h-8 w-8 opacity-40" />
          <p>{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuthReady();
  const supabase = createClient();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    async function load() {
      const result = await fetchAnalyticsData(supabase);
      setData(result);
      setLoading(false);
    }
    load();
  }, [isReady, supabase]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[360px] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (
    !data ||
    (data.submissionTrends.length === 0 &&
      data.successRate.length === 0 &&
      data.collegeComparison.length === 0 &&
      data.reviewerActivity.length === 0)
  ) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground opacity-40" />
          <h3 className="mt-4 text-lg font-semibold">No Analytics Data Yet</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Upload manuscripts, submit evaluations, and add annotations to
            populate institutional analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxScore = Math.max(
    ...data.collegeComparison.map((c) => c.avgScore),
    100
  );
  const yMin = Math.max(0, Math.floor(maxScore - 20));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {data.submissionTrends.some((t) => t.submissions > 0 || t.defenses > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Submission Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.submissionTrends}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  stroke="#3B82F6"
                  fill="url(#subGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="defenses"
                  stroke="#22C55E"
                  fill="none"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <EmptyChart
          title="Submission Trends"
          message="No manuscript uploads recorded yet."
        />
      )}

      {data.successRate.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Defense Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.successRate}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {data.successRate.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <EmptyChart
          title="Defense Success Rate"
          message="No completed defense verdicts yet."
        />
      )}

      {data.collegeComparison.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>College Comparison — Average Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.collegeComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="college" tick={{ fontSize: 12 }} />
                <YAxis domain={[yMin, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#343434" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <EmptyChart
          title="College Comparison"
          message="No evaluation scores by college yet."
        />
      )}

      {data.reviewerActivity.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.reviewerActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="reviews" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="annotations" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <EmptyChart
          title="Reviewer Activity"
          message="No panelist evaluations or annotations yet."
        />
      )}

      {data.departmentComparison && data.departmentComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Comparison — Average Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.departmentComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis domain={[yMin, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {data.facultyWorkload && data.facultyWorkload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty Workload — Evaluation Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.facultyWorkload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="workload" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {data.revisionCount && data.revisionCount.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revision Count per Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.revisionCount} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
