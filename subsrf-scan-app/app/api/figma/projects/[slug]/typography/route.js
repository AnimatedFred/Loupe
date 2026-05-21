import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../../../lib/withAuth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function extractFontName(cssFontFamily) {
  const first = (cssFontFamily || '').split(',')[0].trim();
  return first.replace(/['"]/g, '') || 'Inter';
}

function parsePixelValue(val) {
  const s = String(val || '').trim();
  if (s.endsWith('rem')) return Math.round(parseFloat(s) * 16);
  return Math.round(parseFloat(s)) || 16;
}

export async function GET(request, { params }) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const { slug } = params;
  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('slug, tokens')
    .eq('user_id', auth.user.id)
    .eq('slug', slug)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS });

  const tokens = data.tokens;
  const t = tokens?.[tokens?.hasDark ? 'dark' : tokens?.hasLight ? 'light' : null];
  if (!t) return NextResponse.json({ styles: [] }, { headers: CORS });

  const families = [...(t.typography?.families ?? [])].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  const sizes = t.typography?.sizes ?? [];

  const primaryFamily = families.length > 0 ? extractFontName(families[0].value) : 'Inter';

  const styles = [];

  // One text style per size token using the primary font family
  for (const s of sizes) {
    const name = s.name.startsWith('type/') ? s.name : `type/size/${s.name}`;
    styles.push({ name, fontFamily: primaryFamily, fontStyle: 'Regular', fontSize: parsePixelValue(s.value) });
  }

  // One example style per additional font family (at 16px)
  for (const f of families) {
    const cleanName = extractFontName(f.value);
    if (cleanName === primaryFamily) continue;
    const name = f.name.startsWith('type/') ? f.name : `type/family/${f.name}`;
    styles.push({ name, fontFamily: cleanName, fontStyle: 'Regular', fontSize: 16 });
  }

  return NextResponse.json({ styles }, { headers: CORS });
}
