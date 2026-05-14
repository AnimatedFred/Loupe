import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth, deductCredit } from '../../../../lib/withAuth';

const SYSTEM_INSTRUCTION = `You are a brand identity analyst specialising in digital product design.
Given extracted design tokens from a live website, produce a brand coherence assessment.

Structure your response as:
BRAND COHERENCE SCORE: [0-100] / 100

PERSONALITY READS AS:
[3-5 adjectives separated by · ]

COLOR HARMONY: [score]/100
[2-3 sentences on palette logic and internal consistency]

TYPOGRAPHY PERSONALITY: [score]/100
[2-3 sentences on font choices and what they communicate]

RADIUS PERSONALITY: [score]/100
[1-2 sentences on what the radius choices signal]

SPACING DENSITY: [score]/100
[1-2 sentences on information density impression]

OVERALL:
[2-3 sentences on system intentionality — does this look designed or accumulated?]

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
    colors: tokenData.colors?.slice(0, 15),
    typography: tokenData.typography,
    spacing: tokenData.spacing,
    radius: tokenData.radius,
    shadows: tokenData.shadows,
    meta: tokenData.meta,
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 2) }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
    });
    return NextResponse.json({ brandScore: result.response.text(), creditsRemaining });
  } catch (err) {
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }
}
