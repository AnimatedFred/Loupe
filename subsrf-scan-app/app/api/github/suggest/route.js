import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth, getServiceClient, deductCredit } from '../../../../lib/withAuth';
import { getInstallationToken, getRepoTree, getFileContent } from '../../../../lib/github';

const SYSTEM_INSTRUCTION = `You are a senior design systems engineer performing a design code review.
You identify concrete, actionable improvements in UI codebases from a design perspective.
For every suggestion you MUST provide verbatim lines from the actual file as "before" and the exact replacement as "after".
Keep before/after to 3–8 lines each. Return ONLY valid JSON — no markdown fences, no text outside the array.`;

const AUDITABLE = ['.css', '.scss', '.less', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'vendor', '.git', 'coverage', '__pycache__', '.turbo', '.cache', 'public', 'out', '.vercel']);
const MAX_FILES = 22;
const MAX_FILE_BYTES = 28 * 1024;

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const { owner, repo, installationId, branch = 'main' } = await request.json();
  if (!owner || !repo || !installationId) {
    return NextResponse.json({ error: 'owner, repo, and installationId are required' }, { status: 400 });
  }

  // Deduct credit before running expensive API calls
  const { ok, credits: creditsRemaining } = await deductCredit(auth.user.id);
  if (!ok) {
    return NextResponse.json({ error: 'Insufficient credits for AI analysis' }, { status: 402 });
  }

  // Verify the installation belongs to this user
  const supabase = getServiceClient();
  const { data: inst } = await supabase
    .from('github_installations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('installation_id', installationId)
    .single();
  if (!inst) return NextResponse.json({ error: 'Installation not found' }, { status: 403 });

  try {
    const token = await getInstallationToken(installationId);
    const tree = await getRepoTree(token, owner, repo, branch);

    const candidates = tree.filter(f => {
      if (!AUDITABLE.some(ext => f.path.endsWith(ext))) return false;
      const parts = f.path.split('/');
      if (parts.some(p => SKIP_DIRS.has(p))) return false;
      if ((f.size || 0) > MAX_FILE_BYTES) return false;
      return true;
    });

    const prioritized = candidates
      .sort((a, b) => scoreFile(b.path) - scoreFile(a.path))
      .slice(0, MAX_FILES);

    const fileContents = (await Promise.all(
      prioritized.map(async f => {
        try {
          const content = await getFileContent(token, owner, repo, f.path);
          return content ? { path: f.path, content } : null;
        } catch { return null; }
      })
    )).filter(Boolean);

    if (fileContents.length === 0) {
      return NextResponse.json({ ok: true, suggestions: [], filesAnalyzed: 0, repoName: `${owner}/${repo}` });
    }

    const codeContext = fileContents
      .map(f => `=== ${f.path} ===\n${f.content.slice(0, 7000)}`)
      .join('\n\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_INSTRUCTION });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Review ${owner}/${repo} (${fileContents.length} files) for design quality improvements.

Return 8–15 high-impact suggestions as a JSON array:
[
  {
    "file": "src/components/Button.tsx",
    "title": "Replace hardcoded brand color with token",
    "category": "colors",
    "severity": "warning",
    "line": 12,
    "before": "  color: '#FF5733';\\n  background: '#FF5733';",
    "after": "  color: var(--color-brand);\\n  background: var(--color-brand);",
    "explanation": "Hardcoded in 4 files. Using a variable makes brand updates atomic."
  }
]

Valid categories: colors | typography | spacing | accessibility | consistency | tokens | components

CODEBASE:
${codeContext}`,
        }],
      }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.25,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = result.response.text();
    let suggestions = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) suggestions = JSON.parse(match[0]);
    } catch { suggestions = []; }

    return NextResponse.json({
      ok: true,
      suggestions,
      filesAnalyzed: fileContents.length,
      repoName: `${owner}/${repo}`,
    });
  } catch (err) {
    console.error('[github/suggest] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function scoreFile(path) {
  let s = 0;
  if (path.endsWith('.css') || path.endsWith('.scss')) s += 6;
  if (path.endsWith('.jsx') || path.endsWith('.tsx')) s += 4;
  if (/component|button|card|modal|nav|header|layout|sidebar|form/i.test(path)) s += 3;
  if (/style|theme|token|global|variable|design|color/i.test(path)) s += 3;
  if (/app|index|main/i.test(path)) s += 1;
  return s;
}
