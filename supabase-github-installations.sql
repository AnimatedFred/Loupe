CREATE TABLE github_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id bigint NOT NULL,
  account_login text NOT NULL,       -- org or user name
  account_type text NOT NULL,        -- 'User' or 'Organization'  
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, installation_id)
);

-- RLS: users can only see their own installations
ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own installations" ON github_installations
  FOR ALL USING (auth.uid() = user_id);
