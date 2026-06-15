-- Create check_runs table to track job status
CREATE TABLE IF NOT EXISTS check_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for faster polling
CREATE INDEX IF NOT EXISTS idx_check_runs_status ON check_runs(status);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_check_runs_created_at ON check_runs(created_at DESC);

-- Enable RLS
ALTER TABLE check_runs ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON check_runs
  FOR SELECT TO authenticated
  USING (true);

-- Allow insert to authenticated users
CREATE POLICY "Allow insert to authenticated users" ON check_runs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow update to authenticated users
CREATE POLICY "Allow update to authenticated users" ON check_runs
  FOR UPDATE TO authenticated
  USING (true);
