const fs = require('fs');
const path = 'src/lib/workflow/actions.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix the broken destructuring pattern
const old = "  const { data: { currentAcademicYear } } = { data: await import(\"@/lib/utils/academic-year\") };\r\n  await supabase.from(\"audit_logs\").insert({\r\n    profile_id: user.id,\r\n    user_email: user.email || \"unknown\",\r\n    user_role: \"coordinator\",\r\n    action_type: \"UPDATE\",\r\n    module: \"workflow\",\r\n    entity_type: \"projects\",\r\n    entity_id: projectId,\r\n    description: `Final verdict released: \"${verdictCode}\" for project \"${project.title}\". Remarks: ${remarks || \"None\"}.`,\r\n    new_value: { projectId, verdictCode, remarks },\r\n    ip_address: ip,\r\n    user_agent: userAgent,\r\n    academic_year: currentAcademicYear(),\r\n  });";

const replacement = "  await supabase.from(\"audit_logs\").insert({\r\n    profile_id: user.id,\r\n    user_email: user.email || \"unknown\",\r\n    user_role: \"coordinator\",\r\n    action_type: \"UPDATE\",\r\n    module: \"workflow\",\r\n    entity_type: \"projects\",\r\n    entity_id: projectId,\r\n    description: `Final verdict released: \"${verdictCode}\" for project \"${project.title}\". Remarks: ${remarks || \"None\"}.`,\r\n    new_value: { projectId, verdictCode, remarks },\r\n    ip_address: ip,\r\n    user_agent: userAgent,\r\n    academic_year: (await import(\"@/lib/utils/academic-year\")).currentAcademicYear(),\r\n  });";

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(path, content);
  console.log('DONE - fixed audit log import');
} else {
  console.log('Pattern not found. Checking...');
  // Try to find partial match
  const idx = content.indexOf('currentAcademicYear } } = { data: await import');
  console.log('Idx:', idx);
  if (idx !== -1) {
    console.log('Context:', JSON.stringify(content.substring(idx - 10, idx + 100)));
  }
}
