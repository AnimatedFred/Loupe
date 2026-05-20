import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Verifies the Bearer token and returns { user, tier, credits } or null.
// Also handles monthly credit reset for paid tiers.
export async function verifyAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  try {
    const supabase = getServiceClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, credits, credits_reset_at')
      .eq('id', user.id)
      .single();

    const tier = profile?.tier || 'free';
    let credits = profile?.credits ?? 0;
    const tierCredits = { pro: 300, starter: 75 }[tier] ?? 0;

    // Monthly reset
    const now = new Date();
    const lastReset = profile?.credits_reset_at ? new Date(profile.credits_reset_at) : null;
    const prevMonth = !lastReset ||
      lastReset.getFullYear() < now.getFullYear() ||
      (lastReset.getFullYear() === now.getFullYear() && lastReset.getMonth() < now.getMonth());

    if (prevMonth && tierCredits > 0) {
      await supabase.from('profiles').update({
        credits: tierCredits,
        credits_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      }).eq('id', user.id);
      credits = tierCredits;
    }

    return { user, tier, credits };
  } catch {
    return null;
  }
}

// Atomically deducts 1 credit. Returns { ok, credits } where credits is the new balance.
export async function deductCredit(userId) {
  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  const current = profile?.credits ?? 0;
  if (current < 1) return { ok: false, credits: 0 };

  const { error } = await supabase
    .from('profiles')
    .update({ credits: current - 1 })
    .eq('id', userId);

  if (error) return { ok: false, credits: current };
  return { ok: true, credits: current - 1 };
}
