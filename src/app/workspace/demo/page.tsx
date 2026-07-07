"use client";

import nextDynamic from "next/dynamic";

const DemoClient = nextDynamic(
  () => import("./demo-client"),
  { ssr: false }
);

export default function WorkspaceDemoPage() {
  return <DemoClient />;
}
