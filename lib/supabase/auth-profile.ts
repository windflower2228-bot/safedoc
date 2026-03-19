import { createAdminClient } from '@/lib/supabase/server'

type ProfileLookupResult<TProfile> = {
  profile: TProfile | null
  errorMessage?: string
}

// Prefer per-user client for least privilege, then fall back to service-role lookup
// when RLS/policy issues block reading the current user's own profile row.
export async function getProfileForAuth<TProfile>(
  userSupabase: any,
  userId: string,
  columns: string
): Promise<ProfileLookupResult<TProfile>> {
  const { data: directProfile, error: directError } = await userSupabase
    .from('user_profiles')
    .select(columns)
    .eq('id', userId)
    .maybeSingle()

  if (directProfile) {
    return { profile: directProfile as TProfile }
  }

  const admin = createAdminClient()
  const { data: adminProfile, error: adminError } = await admin
    .from('user_profiles')
    .select(columns)
    .eq('id', userId)
    .maybeSingle()

  if (adminError) {
    return {
      profile: null,
      errorMessage: [directError?.message, adminError.message].filter(Boolean).join(' | '),
    }
  }

  if (!adminProfile) {
    return {
      profile: null,
      errorMessage: directError?.message,
    }
  }

  return { profile: adminProfile as TProfile }
}
