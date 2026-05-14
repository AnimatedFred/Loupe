import { NextResponse } from 'next/server';

export const maxDuration = 60;

const raw = process.env.EXTRACTOR_URL || 'http://localhost:3001';
const EXTRACTOR_URL = raw.startsWith('http') ? raw : `https://${raw}`;

export async function POST(request) {
  const { url, mode = 'both', selector = null } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${EXTRACTOR_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mode, selector }),
      signal: AbortSignal.timeout(35000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Extraction failed' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Extraction timed out (>35s). Try a simpler page.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Extraction service unavailable: ' + err.message }, { status: 503 });
  }
}
