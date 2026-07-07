import Link from "next/link";
import {
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { APP_FULL_NAME, APP_NAME, INSTITUTION } from "@/constants/app";

const features = [
  {
    icon: FileText,
    title: "Split-Screen Review",
    description:
      "Review manuscripts and complete rubrics in one unified workspace.",
  },
  {
    icon: MessageSquare,
    title: "Google Docs Annotations",
    description:
      "Anchored comments, threaded replies, and real-time collaboration.",
  },
  {
    icon: BarChart3,
    title: "Institutional Analytics",
    description:
      "Pass rates, reviewer workload, and college-level performance insights.",
  },
  {
    icon: Shield,
    title: "Audit-Grade Security",
    description:
      "Immutable audit trails with government-grade accountability.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">{APP_NAME}</span>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {INSTITUTION}
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground">
          Paperless Defense
          <br />
          <span className="text-muted-foreground">Management Platform</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {APP_FULL_NAME}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:shadow-md"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/workspace/proj-001/s3"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition hover:shadow-md"
          >
            Try Review Workspace
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border p-6 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
