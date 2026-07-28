// Run with: node scripts/migrate.mjs
// Pastikan .env.local sudah diisi dengan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di .env.local');
    process.exit(1);
  }

  const queries = [
    `CREATE TABLE IF NOT EXISTS families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL DEFAULT 'Keluarga Saya',
      invite_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS family_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(family_id, user_id)
    );`,

    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;`,

    `CREATE TABLE IF NOT EXISTS targets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount NUMERIC NOT NULL DEFAULT 0,
      saved_amount NUMERIC NOT NULL DEFAULT 0,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON transactions(family_id);`,
    `CREATE INDEX IF NOT EXISTS idx_targets_family_id ON targets(family_id);`,
  ];

  for (const query of queries) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        console.log(`OK: ${query.slice(0, 60)}...`);
      } else {
        const text = await res.text();
        console.log(`FAIL (${res.status}): ${query.slice(0, 60)}... -> ${text}`);
      }
    } catch (err) {
      console.log(`ERROR: ${query.slice(0, 60)}... -> ${err.message}`);
    }
  }

  console.log('\nSelesai! Cek hasil di atas.');
}

run();
