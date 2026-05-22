-- repo_project_links: maps a GitHub repo to a Subsrf scan project.
-- The webhook uses this to know which token set to enforce on each repo.

CREATE TABLE repo_project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_full_name text NOT NULL,        -- e.g. "acme/frontend"
  project_slug text NOT NULL,          -- scan_projects.slug
  installation_id bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, repo_full_name)
);

ALTER TABLE repo_project_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own links" ON repo_project_links
  FOR ALL USING (auth.uid() = user_id);
