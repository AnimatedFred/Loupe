import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

// GET /api/github/links — list all repo→project mappings for the user
// Optional ?repo=owner/name to fetch a single link
export async function GET(req) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const repo = new URL(req.url).searchParams.get('repo');
  const db = getServiceClient();

  let query = db
    .from('repo_project_links')
    .select('repo_full_name, project_slug, installation_id, created_at')
    .eq('user_id', auth.user.id);

  if (repo) query = query.eq('repo_full_name', repo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: data || [] });
}

// POST /api/github/links — create or update a link
// Body: { repoFullName, projectSlug, installationId }
export async function POST(req) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoFullName, projectSlug, installationId } = await req.json();
  if (!repoFullName || !projectSlug || !installationId) {
    return NextResponse.json({ error: 'repoFullName, projectSlug, and installationId are required' }, { status: 400 });
  }

  const db = getServiceClient();

  // Verify the project belongs to this user
  const { data: project } = await db
    .from('scan_projects')
    .select('slug')
    .eq('slug', projectSlug)
    .eq('user_id', auth.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { error } = await db
    .from('repo_project_links')
    .upsert(
      {
        user_id: auth.user.id,
        repo_full_name: repoFullName,
        project_slug: projectSlug,
        installation_id: installationId,
      },
      { onConflict: 'user_id,repo_full_name' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/github/links — remove a link
// Body: { repoFullName }
export async function DELETE(req) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repoFullName } = await req.json();
  if (!repoFullName) return NextResponse.json({ error: 'repoFullName is required' }, { status: 400 });

  const db = getServiceClient();
  const { error } = await db
    .from('repo_project_links')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('repo_full_name', repoFullName);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
