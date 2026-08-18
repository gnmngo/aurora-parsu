const fs = require('fs');
const p = 'src/lib/scheduler/actions.ts';
let c = fs.readFileSync(p, 'utf8');
// Fix the TypeScript error on the cast
const old = '      : (project?.students as { profile_id?: string })?.profile_id;';
const fix = '      : (project?.students as unknown as { profile_id?: string })?.profile_id;';
if (c.includes(old)) {
  c = c.replace(old, fix);
  fs.writeFileSync(p, c);
  console.log('DONE: fixed type cast');
} else {
  console.log('Pattern not found');
}
