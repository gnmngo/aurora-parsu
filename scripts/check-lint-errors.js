const { execSync } = require("child_process");

try {
  const out = execSync("npx eslint src --format json", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const results = JSON.parse(out);
  const errors = [];
  for (const r of results) {
    if (r.errorCount > 0) {
      for (const m of r.messages) {
        if (m.severity === 2) {
          errors.push({ file: r.filePath, line: m.line, rule: m.ruleId, message: m.message });
        }
      }
    }
  }
  console.log(`Total Errors: ${errors.length}`);
  console.log(JSON.stringify(errors, null, 2));
} catch (e) {
  if (e.stdout) {
    try {
      const results = JSON.parse(e.stdout);
      const errors = [];
      for (const r of results) {
        if (r.errorCount > 0) {
          for (const m of r.messages) {
            if (m.severity === 2) {
              errors.push({ file: r.filePath.replace(/.*src/, "src"), line: m.line, rule: m.ruleId, message: m.message });
            }
          }
        }
      }
      console.log(`Total Errors: ${errors.length}`);
      console.log(JSON.stringify(errors, null, 2));
    } catch (parseErr) {
      console.log("Raw output:", e.stdout.slice(0, 1000));
    }
  } else {
    console.error(e.message);
  }
}
