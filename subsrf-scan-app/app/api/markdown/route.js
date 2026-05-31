import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth, deductCredit } from '../../../lib/withAuth';

const SYSTEM_INSTRUCTION = `You are a world-class OCR and document conversion engine. 
Your goal is to extract the text, layout, and structure from the provided image/document and format it flawlessly into GitHub-Flavored Markdown.
- Preserve headings, lists, tables, and code blocks perfectly.
- Ensure all text is accurately transcribed.
- Output ONLY valid markdown. Do not wrap your response in markdown code block ticks unless the document itself contains them. Do not include any conversational filler.`;

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (auth.credits < 1) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const { ok, credits: creditsRemaining } = await deductCredit(auth.user.id);
  if (!ok) return NextResponse.json({ error: 'No credits remaining. Upgrade your plan at subsrf.dev.' }, { status: 402 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_INSTRUCTION });
    
    // Base64 payload might include data URI prefix (e.g. data:image/png;base64,...). Strip it if present.
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: "Convert this document into Markdown." }
        ]
      }],
      generationConfig: { maxOutputTokens: 4000, temperature: 0.1 },
    });
    
    return NextResponse.json({ markdown: result.response.text(), creditsRemaining });
  } catch (err) {
    console.error('[markdown-api] Gemini error:', err.message);
    return NextResponse.json({ error: 'Markdown generation failed: ' + err.message }, { status: 500 });
  }
}
