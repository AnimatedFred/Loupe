import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth, deductCredit } from '../../../../lib/withAuth';

const SYSTEM_INSTRUCTION = `You are a design system expert.
Answer the user's question about the extracted design tokens using only the data provided.
Be specific — cite exact token names and values. Keep the answer under 150 words.
If the data doesn't contain enough information to answer, say so directly.
Plain text only — no markdown, no code blocks, no backticks.`;

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (auth.credits < 1) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const { ok, credits: creditsRemaining } = await deductCredit(auth.user.id);
  if (!ok) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const { tokens, question, mode = 'dark' } = await request.json();
  if (!tokens || !question) return NextResponse.json({ error: 'tokens and question required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const tokenData = tokens[mode] || tokens.dark || tokens.light;
  if (!tokenData) return NextResponse.json({ error: 'No token data available' }, { status: 400 });

  const payload = {
    url: tokens.url,
    question,
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload, null, 2) }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
    });
    return NextResponse.json({ answer: result.response.text(), creditsRemaining });
  } catch (err) {
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }
}
