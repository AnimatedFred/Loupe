import { verifyAuth, getServiceClient } from '../../../lib/withAuth';

export async function POST(req) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sourceUrl, tokens } = await req.json();
  if (!sourceUrl || !tokens) return Response.json({ error: 'sourceUrl and tokens required' }, { status: 400 });

  let hostname = 'project';
  try {
    hostname = new URL(sourceUrl.startsWith('http') ? sourceUrl : 'https://' + sourceUrl)
      .hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {}

  const db = getServiceClient();

  // Check if user already has a project for this URL — reuse the slug
  const { data: existing } = await db
    .from('scan_projects')
    .select('slug')
    .eq('user_id', auth.user.id)
    .eq('source_url', sourceUrl)
    .single();

  if (existing) {
    await db
      .from('scan_projects')
      .update({ tokens, updated_at: new Date().toISOString() })
      .eq('slug', existing.slug);
    return Response.json({ slug: existing.slug });
  }

  const slug = `${hostname}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await db
    .from('scan_projects')
    .insert({ user_id: auth.user.id, slug, source_url: sourceUrl, tokens })
    .select('slug')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ slug: data.slug });
}
