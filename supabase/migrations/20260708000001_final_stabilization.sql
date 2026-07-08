-- Step 1: Fix Permissions (Grant PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_templates TO anon, authenticated, service_role;

-- Step 2: Add join_code to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS join_code VARCHAR(8) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_projects_join_code ON public.projects(join_code);

-- Function to generate random 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_join_code() RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * 36)::int + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate join_code if null
CREATE OR REPLACE FUNCTION public.set_project_join_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := public.generate_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_projects_join_code ON public.projects;
CREATE TRIGGER tr_projects_join_code
BEFORE INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_project_join_code();

-- Generate codes for existing projects
UPDATE public.projects SET join_code = public.generate_join_code() WHERE join_code IS NULL;

-- Step 3: Safely migrate students.program to UUID
DO $$
DECLARE
  v_program_id UUID;
  v_dept_id UUID;
BEGIN
  -- Add program_id column safely
  BEGIN
    ALTER TABLE public.students ADD COLUMN program_id UUID REFERENCES public.programs(id);
  EXCEPTION
    WHEN duplicate_column THEN
      -- Column already exists
  END;

  -- Attempt to resolve existing string programs to UUIDs safely
  SELECT id INTO v_dept_id FROM public.departments LIMIT 1;
  
  IF v_dept_id IS NOT NULL THEN
     -- Ensure BSCS exists
     SELECT id INTO v_program_id FROM public.programs WHERE code = 'BSCS' LIMIT 1;
     IF v_program_id IS NULL THEN
        INSERT INTO public.programs (department_id, name, code) 
        VALUES (v_dept_id, 'BS Computer Science', 'BSCS') 
        RETURNING id INTO v_program_id;
     END IF;
     
     -- Ensure BSIT exists
     SELECT id INTO v_program_id FROM public.programs WHERE code = 'BSIT' LIMIT 1;
     IF v_program_id IS NULL THEN
        INSERT INTO public.programs (department_id, name, code) 
        VALUES (v_dept_id, 'BS Information Technology', 'BSIT') 
        RETURNING id INTO v_program_id;
     END IF;
     
     -- Update students by exact match
     UPDATE public.students s
     SET program_id = p.id
     FROM public.programs p
     WHERE s.program = p.code OR s.program = p.name;
  END IF;

  -- Drop the old varchar column
  BEGIN
    ALTER TABLE public.students DROP COLUMN program;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column already dropped
  END;
END $$;
