import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth, deductCredit } from '../../../../lib/withAuth';

const SYSTEM_INSTRUCTION = `You are a professional design system analyst.
Given structured JSON of extracted design tokens from a live website, produce a structured critique covering:
1. Type scale logic and readability
2. Color palette coherence and brand personality
3. Spacing system completeness — missing values, outliers
4. Dark/light mode parity — values that don't translate well
5. Overall design system maturity assessment (score out of 10)

Format with ALL-CAPS section headers. Be specific — cite exact token names and values. Identify both strengths and problems.
Plain text only — no markdown, no code blocks, no backticks.`;

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (auth.credits < 1) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const { ok, credits: creditsRemaining } = await deductCredit(auth.user.id);
  if (!ok) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const { tokens, mode = 'dark' } = await request.json();
  if (!tokens) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const tokenData = tokens[mode] || tokens.dark || tokens.light;
  if (!tokenData) return NextResponse.json({ error: 'No token data available' }, { status: 400 });

  const payload = {
    url: tokens.url,
    modes: tokens.modes,
    healthScore: tokens.healthScore,
    colors: tokenData.colors,
    typography: tokenData.typography,
    spacing: tokenData.spacing,
    radius: tokenData.radius,
    shadows: tokenData.shadows,
    animations: tokenData.animations,
    meta: tokenData.meta,
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 2) }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
    });
    return NextResponse.json({ critique: result.response.text(), creditsRemaining });
  } catch (err) {
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }
}
