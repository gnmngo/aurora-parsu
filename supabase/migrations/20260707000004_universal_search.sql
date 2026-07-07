-- ============================================================
-- AURORA Module 6: Universal Search Engine Function
-- Partido State University – Goa Campus
-- ============================================================

CREATE OR REPLACE FUNCTION search_projects(
  p_query TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_academic_year TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status public.project_status,
  academic_year VARCHAR,
  stage_name VARCHAR,
  student_name TEXT,
  adviser_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.title,
    p.status,
    p.academic_year,
    COALESCE(ds.name, 'Concept Stage') AS stage_name,
    COALESCE(sp.first_name || ' ' || sp.last_name, 'Unknown Student') AS student_name,
    COALESCE(ap.first_name || ' ' || ap.last_name, 'None Assigned') AS adviser_name,
    p.created_at
  FROM public.projects p
  LEFT JOIN public.defense_stages ds ON ds.id = p.current_stage_id
  LEFT JOIN public.students s ON s.id = p.student_id
  LEFT JOIN public.profiles sp ON sp.id = s.profile_id
  LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.member_role = 'adviser'
  LEFT JOIN public.profiles ap ON ap.id = pm.profile_id
  WHERE 
    (p_query IS NULL OR p_query = '' OR
     p.title ILIKE '%' || p_query || '%' OR
     sp.first_name || ' ' || sp.last_name ILIKE '%' || p_query || '%' OR
     ap.first_name || ' ' || ap.last_name ILIKE '%' || p_query || '%'
    )
    AND (p_status IS NULL OR p_status = '' OR p.status = p_status::public.project_status)
    AND (p_stage_id IS NULL OR p.current_stage_id = p_stage_id)
    AND (p_academic_year IS NULL OR p_academic_year = '' OR p.academic_year = p_academic_year)
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
