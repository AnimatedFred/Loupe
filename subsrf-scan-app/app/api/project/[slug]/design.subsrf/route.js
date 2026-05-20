import { getServiceClient } from '../../../../../lib/withAuth';
import { generateSubsrf } from '../../../../../lib/subSrfTransformer';

export async function GET(req, { params }) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('source_url, tokens, curated_tokens')
    .eq('slug', params.slug)
    .single();

  if (error || !data) return new Response('Not found', { status: 404 });

  const tokens = data.tokens;
  const mode = tokens.hasDark ? 'dark' : 'light';
  const effectiveTokens = data.curated_tokens
    ? { ...tokens, [mode]: data.curated_tokens }
    : tokens;
  const content = generateSubsrf(effectiveTokens, data.source_url, mode);

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="design.subsrf"',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
