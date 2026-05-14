import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are a design systems engineer.
Given extracted design tokens and health score issues, produce a numbered list of concrete improvement suggestions.
For each suggestion:
- State the exact problem
- Provide the specific replacement value (exact hex codes, exact px values)
- Explain the reason in one sentence

Cover: near-duplicate colors to merge, contrast failures to fix (provide passing hex), off-grid spacing to align, type scale gaps to fill.
Be specific — no vague advice. Plain text only — no markdown, no code blocks, no backticks.`;

export async function POST(request) {
  const { tokens, mode = 'dark' } = await request.json();
  if (!tokens) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const tokenData = tokens[mode] || tokens.dark || tokens.light;
  if (!tokenData) return NextResponse.json({ error: 'No token data available' }, { status: 400 });

  const payload = {
    url: tokens.url,
    healthScore: tokens.healthScore,
    colors: tokenData.colors?.slice(0, 20),
    typography: { sizes: tokenData.typography?.sizes, families: tokenData.typography?.families },
    spacing: tokenData.spacing,
    radius: tokenData.radius,
    meta: tokenData.meta,
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 2) }] }],
      generationConfig: { maxOutputTokens: 1500, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
    });
    return NextResponse.json({ suggestions: result.response.text() });
  } catch (err) {
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }
}
