import { supabase } from './supabase';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface Target {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  created_by: string;
  created_at: string;
}

import { randomInt } from 'node:crypto';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(randomInt(0, chars.length));
  }
  return code;
}

export async function getUserFamily(userId: string): Promise<{ family: Family; role: string } | null> {
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', userId)
    .single();

  if (!membership) return null;

  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('id', membership.family_id)
    .single();

  if (!family) return null;

  return { family, role: membership.role };
}
