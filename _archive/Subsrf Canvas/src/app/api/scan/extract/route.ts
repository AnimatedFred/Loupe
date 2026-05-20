import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    // Stub — returns mock token data
    const tokens = [
      { name: 'color.primary',    category: 'color',   value: '#0070F3' },
      { name: 'color.background', category: 'color',   value: '#FAFAFA' },
      { name: 'color.text',       category: 'color',   value: '#111111' },
      { name: 'spacing.sm',       category: 'spacing', value: '8px' },
      { name: 'spacing.md',       category: 'spacing', value: '16px' },
      { name: 'spacing.lg',       category: 'spacing', value: '24px' },
      { name: 'radius.base',      category: 'radius',  value: '6px' },
    ]

    return NextResponse.json({ tokens, source: url, extractedAt: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Scan failed' }, { status: 500 })
  }
}
