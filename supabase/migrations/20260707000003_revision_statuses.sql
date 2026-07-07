-- ============================================================
-- AURORA Module 4: Revision Management Status Expansion
-- Partido State University – Goa Campus
-- ============================================================

-- Add new status values to annotation_status enum safely
-- Note: In PG, ALTER TYPE ADD VALUE cannot run inside a transaction block in some versions,
-- but standard Supabase migration running executes them correctly.
ALTER TYPE public.annotation_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.annotation_status ADD VALUE IF NOT EXISTS 'addressed';
ALTER TYPE public.annotation_status ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE public.annotation_status ADD VALUE IF NOT EXISTS 'closed';

-- Create table to track annotation revision status change history
CREATE TABLE IF NOT EXISTS public.annotation_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES public.annotations(id) ON DELETE CASCADE,
  from_status   public.annotation_status,
  to_status     public.annotation_status NOT NULL,
  notes         TEXT,
  changed_by    UUID REFERENCES public.profiles(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on annotation_history
ALTER TABLE public.annotation_history ENABLE ROW LEVEL SECURITY;

-- Select policy: participants can read history
DROP POLICY IF EXISTS annotation_history_select ON public.annotation_history;
CREATE POLICY annotation_history_select ON public.annotation_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.annotations a
      JOIN public.document_versions dv ON dv.id = a.document_version_id
      JOIN public.documents d ON d.id = dv.document_id
      WHERE a.id = annotation_history.annotation_id
        AND (
          is_project_participant(d.project_id)
          OR has_role('coordinator')
          OR has_role('sys_admin')
        )
    )
  );

-- Insert policy: authenticated users can insert history
DROP POLICY IF EXISTS annotation_history_insert ON public.annotation_history;
CREATE POLICY annotation_history_insert ON public.annotation_history FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = changed_by
  );
