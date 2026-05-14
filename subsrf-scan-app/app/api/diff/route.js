import { NextResponse } from 'next/server';

const EXTRACTOR_URL = process.env.EXTRACTOR_URL || 'http://localhost:3001';

export async function POST(request) {
  const { urlA, urlB, mode = 'both' } = await request.json();

  if (!urlA || !urlB) {
    return NextResponse.json({ error: 'urlA and urlB are required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${EXTRACTOR_URL}/diff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlA, urlB, mode }),
      signal: AbortSignal.timeout(70000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Diff failed' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Diff timed out. Both pages must load within 35s each.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Extraction service unavailable: ' + err.message }, { status: 503 });
  }
}
