import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

export async function GET(req, { params }) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('slug, source_url, tokens, curated_tokens')
    .eq('slug', params.slug)
    .eq('user_id', auth.user.id)
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}

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

export async function DELETE(req, { params }) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceClient();
  const { error } = await db
    .from('scan_projects')
    .delete()
    .eq('slug', params.slug)
    .eq('user_id', auth.user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
