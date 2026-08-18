require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkStorage() {
  console.log("Checking Supabase Storage Buckets...\n");
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }

  console.log("Existing buckets:", buckets.map(b => `${b.name} (public: ${b.public})`));

  const hasSignatures = buckets.some(b => b.name === "signatures");
  if (!hasSignatures) {
    console.log("\nCreating 'signatures' private bucket...");
    const { data, error: createErr } = await supabase.storage.createBucket("signatures", {
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
    if (createErr) {
      console.error("Failed to create 'signatures' bucket:", createErr.message);
    } else {
      console.log("Successfully created 'signatures' private bucket:", data);
    }
  } else {
    console.log("\n'signatures' bucket already exists.");
  }

  const hasManuscripts = buckets.some(b => b.name === "manuscripts");
  if (!hasManuscripts) {
    console.log("\nCreating 'manuscripts' private bucket...");
    const { data, error: createErr } = await supabase.storage.createBucket("manuscripts", {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ["application/pdf"],
    });
    if (createErr) {
      console.error("Failed to create 'manuscripts' bucket:", createErr.message);
    } else {
      console.log("Successfully created 'manuscripts' private bucket:", data);
    }
  } else {
    console.log("'manuscripts' bucket already exists.");
  }
}

checkStorage();
