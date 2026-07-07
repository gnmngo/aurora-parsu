import * as fs from "fs";
import * as path from "path";

// 1. Zero-dependency env loader to read .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.trim().startsWith('"') && value.trim().endsWith('"')) {
        value = value.trim().slice(1, -1);
      } else if (value.trim().startsWith("'") && value.trim().endsWith("'")) {
        value = value.trim().slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

// 2. Import and run the seeder
import { runDemoSeeder } from "../src/lib/admin/seeder";

async function main() {
  try {
    await runDemoSeeder();
  } catch (err) {
    console.error("Seeding execution error:", err);
    process.exit(1);
  }
}

main();
