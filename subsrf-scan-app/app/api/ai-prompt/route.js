import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are a design system analyst.
Given structured JSON of extracted design tokens from a live website, produce a clean, human-readable summary optimised as context for AI coding prompts (Claude, Cursor, Lovable, v0, Bolt).

Rules:
- Group by category with ALL-CAPS section headers
- Include hex values and a brief contextual note on usage role where clear
- Note the base spacing unit and the full scale
- Identify the primary accent color and its usage pattern
- Separate dark and light mode values where both exist
- Total output under 400 words
- Plain text only — no markdown, no code blocks, no backticks`;

export async function POST(request) {
  const { tokens, mode = 'dark' } = await request.json();
  if (!tokens) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  const tokenData = tokens[mode] || tokens.dark || tokens.light;
  if (!tokenData) return NextResponse.json({ error: 'No token data available' }, { status: 400 });

  const payload = {
    url: tokens.url,
    modes: tokens.modes,
    meta: tokenData.meta,
    colors: tokenData.colors,
    typography: tokenData.typography,
    spacing: tokenData.spacing,
    radius: tokenData.radius,
    shadows: tokenData.shadows,
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 2) }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const prompt = result.response.text();
    return NextResponse.json({ prompt });
  } catch (err) {
    console.error('[ai-prompt] Gemini error:', err.message);
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }
}
