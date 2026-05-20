import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { fileId, scope, changedNodeIds } = await req.json()
    if (!fileId) return NextResponse.json({ error: 'No fileId' }, { status: 400 })

    // Stub — simulates a successful push
    return NextResponse.json({
      success: true,
      branch: `subsrf/${scope ?? 'page'}-${Date.now()}`,
      prUrl: null,
      previewUrl: null,
      changedFiles: (changedNodeIds ?? []).map((id: string) => `src/components/${id.slice(0,6)}.tsx`),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Push failed' }, { status: 500 })
  }
}
