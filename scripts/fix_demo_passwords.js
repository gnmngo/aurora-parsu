const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || "";
      val = val.trim().replace(/^["']|["']$/g, "");
      env[match[1]] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const anonClient = createClient(supabaseUrl, anonKey);

async function main() {
  const demoAccounts = [
    { email: "admin@aurora.test", role: "sys_admin", name: "Aurora Administrator" },
    { email: "coord@aurora.test", role: "coordinator", name: "Dr. Kennedy C. Cuya" },
    { email: "coordinator@aurora.test", role: "coordinator", name: "Department Coordinator" },
    { email: "adviser1@aurora.test", role: "adviser", name: "Adviser Demo" },
    { email: "faculty1@aurora.test", role: "adviser", name: "Adviser Demo" },
    { email: "panelist1@aurora.test", role: "panelist", name: "Froiland B. Peñalosa" },
    { email: "panelist2@aurora.test", role: "panelist", name: "Dr. Aris Thorne (Demo Panelist)" },
    { email: "student1@aurora.test", role: "student", name: "Juan Dela Cruz" }
  ];

  const passwordToSet = "Password123!";

  console.log(`Setting all demo accounts password to: "${passwordToSet}" and confirming email...`);

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  const allUsers = usersData?.users || [];

  for (const acc of demoAccounts) {
    const u = allUsers.find(x => x.email === acc.email);
    if (!u) continue;

    const [fName, ...lNames] = acc.name.split(" ");
    const lName = lNames.join(" ");

    // 1. Update auth
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
      password: passwordToSet,
      email_confirm: true,
      user_metadata: {
        ...u.user_metadata,
        first_name: fName,
        last_name: lName,
        full_name: acc.name,
        role: acc.role
      }
    });

    if (updErr) console.error(`Error updating user ${acc.email}:`, updErr.message);

    // 2. Update profile
    await supabaseAdmin.from("profiles").update({
      first_name: fName,
      last_name: lName,
      status: "approved"
    }).eq("id", u.id);

    // 3. Test login
    const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: passwordToSet
    });

    console.log(`Account ${acc.email} (${acc.role}): ${loginErr ? "FAIL: " + loginErr.message : "SUCCESS (Logged In!)"}`);
  }
}

main().catch(console.error);
