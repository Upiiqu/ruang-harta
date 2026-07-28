-- Tabel keluarga
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Keluarga Saya',
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anggota keluarga
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- Tambah family_id ke tabel transaksi (kalau belum ada)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL;

-- Tabel target keuangan (shared per keluarga)
CREATE TABLE IF NOT EXISTS targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  saved_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🔒 Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: family members can read their family
CREATE POLICY "family_members_read" ON families
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = id AND user_id = auth.uid())
  );

-- Policy: owners can update their family
CREATE POLICY "family_owners_update" ON families
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = id AND user_id = auth.uid() AND role = 'owner')
  );

-- Policy: family members can read member list
CREATE POLICY "family_members_read_members" ON family_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid())
  );

-- Policy: users can insert themselves as members
CREATE POLICY "family_members_insert_self" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: users can read their own transactions + family transactions
CREATE POLICY "transactions_read_own_and_family" ON transactions
  FOR SELECT USING (
    user_id = auth.uid() OR
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: users can insert their own transactions
CREATE POLICY "transactions_insert_own" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: users can update their own transactions
CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

-- Policy: users can delete their own transactions
CREATE POLICY "transactions_delete_own" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- Policy: family members can read targets
CREATE POLICY "targets_read_family" ON targets
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: family owners can manage targets
CREATE POLICY "targets_manage_owners" ON targets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = targets.family_id AND user_id = auth.uid() AND role = 'owner')
  );
CREATE POLICY "targets_update_owners" ON targets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = targets.family_id AND user_id = auth.uid() AND role = 'owner')
  );
CREATE POLICY "targets_delete_owners" ON targets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = targets.family_id AND user_id = auth.uid() AND role = 'owner')
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_targets_family_id ON targets(family_id);
