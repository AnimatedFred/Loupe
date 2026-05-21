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

function hexToRgba(raw) {
  if (!raw) return { r: 0, g: 0, b: 0, a: 1 };
  const s = raw.trim();

  // Handle rgb()/rgba()
  const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]) / 255,
      g: parseInt(rgbMatch[2]) / 255,
      b: parseInt(rgbMatch[3]) / 255,
      a: rgbMatch[4] != null ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  let hex = s.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: parseInt(hex.slice(6, 8), 16) / 255,
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function parsePixelValue(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.endsWith('rem')) return parseFloat(s) * 16;
  return parseFloat(s) || 0;
}

export async function GET(request, { params }) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const { slug } = params;
  const url = new URL(request.url);
  const categories = url.searchParams.get('categories')?.split(',') ?? ['colors', 'spacing', 'radius', 'typography'];

  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('slug, source_url, tokens')
    .eq('user_id', auth.user.id)
    .eq('slug', slug)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS });

  const tokens = data.tokens;
  const hasDark = !!tokens?.hasDark;
  const hasLight = !!tokens?.hasLight;
  const modes = hasDark && hasLight ? ['Dark', 'Light'] : hasDark ? ['Dark'] : hasLight ? ['Light'] : ['Default'];
  const primaryMode = modes[0];

  const variables = [];

  if (categories.includes('colors')) {
    const darkColors = tokens?.dark?.colors ?? [];
    const lightColors = tokens?.light?.colors ?? [];
    const allNames = [...new Set([...darkColors.map(c => c.name), ...lightColors.map(c => c.name)])];

    for (const name of allNames) {
      const values = {};
      if (hasDark) {
        const c = darkColors.find(c => c.name === name);
        if (c) values['Dark'] = hexToRgba(c.hex || c.value);
      }
      if (hasLight) {
        const c = lightColors.find(c => c.name === name);
        if (c) values['Light'] = hexToRgba(c.hex || c.value);
      }
      if (!hasDark && !hasLight) {
        const t = tokens?.default?.colors ?? [];
        const c = t.find(c => c.name === name);
        if (c) values['Default'] = hexToRgba(c.hex || c.value);
      }
      if (Object.keys(values).length > 0) {
        variables.push({ name, type: 'COLOR', values });
      }
    }
  }

  const primaryTokens = tokens?.[hasDark ? 'dark' : hasLight ? 'light' : 'default'] ?? {};

  if (categories.includes('spacing')) {
    for (const s of (primaryTokens.spacing ?? [])) {
      const varName = s.name.startsWith('space/') ? s.name : `space/${s.name}`;
      const val = parsePixelValue(s.value);
      const values = Object.fromEntries(modes.map(m => [m, val]));
      variables.push({ name: varName, type: 'FLOAT', values });
    }
  }

  if (categories.includes('radius')) {
    for (const r of (primaryTokens.radius ?? [])) {
      const varName = r.name.startsWith('radius/') ? r.name : `radius/${r.name}`;
      const val = parsePixelValue(r.value);
      const values = Object.fromEntries(modes.map(m => [m, val]));
      variables.push({ name: varName, type: 'FLOAT', values });
    }
  }

  if (categories.includes('typography')) {
    for (const s of (primaryTokens.typography?.sizes ?? [])) {
      const varName = s.name.startsWith('type/') ? s.name : `type/size/${s.name}`;
      const val = parsePixelValue(s.value);
      const values = Object.fromEntries(modes.map(m => [m, val]));
      variables.push({ name: varName, type: 'FLOAT', values });
    }
  }

  return NextResponse.json({ name: data.slug, modes, variables }, { headers: CORS });
}
