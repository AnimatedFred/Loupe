import { verifyAuth, getServiceClient } from '../../../../../lib/withAuth';
import { generateConfig } from '../../../../../lib/generateConfig';

// GET /api/project/:slug/config
// Returns the .subsrf.json config for the given project as a downloadable file.
export async function GET(req, { params }) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('source_url, tokens, curated_tokens')
    .eq('slug', params.slug)
    .eq('user_id', auth.user.id)
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });

  const tokenSet = data.curated_tokens
    ? { ...data.tokens, [data.tokens.hasDark ? 'dark' : 'light']: data.curated_tokens }
    : data.tokens;

  const config = generateConfig(tokenSet, data.source_url);

  return new Response(JSON.stringify(config, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename=".subsrf.json"',
      'Cache-Control': 'no-store',
    },
  });
}
