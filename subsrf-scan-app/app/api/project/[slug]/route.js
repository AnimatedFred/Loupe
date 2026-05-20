import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

export async function PATCH(req, { params }) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { curatedTokens } = await req.json();
  if (!curatedTokens) return Response.json({ error: 'curatedTokens required' }, { status: 400 });

  const db = getServiceClient();
  const { error } = await db
    .from('scan_projects')
    .update({ curated_tokens: curatedTokens, updated_at: new Date().toISOString() })
    .eq('slug', params.slug)
    .eq('user_id', auth.user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
