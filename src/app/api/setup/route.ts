import { NextResponse } from 'next/server';

// Endpoint ini untuk migrasi database — HANYA bisa diakses via environment variable token rahasia
// Jangan pernah expose endpoint ini ke publik

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SETUP_SECRET = process.env.SETUP_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!SETUP_SECRET || token !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

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
      if (!res.ok) {
        const text = await res.text();
        results.push(`Gagal: ${query.slice(0, 60)}... → ${res.status}: ${text}`);
      } else {
        results.push(`OK: ${query.slice(0, 60)}...`);
      }
    } catch (err: any) {
      results.push(`Error: ${query.slice(0, 60)}... → ${err.message}`);
    }
  }

  return NextResponse.json({ success: results.every(r => r.startsWith('OK')), results });
}
