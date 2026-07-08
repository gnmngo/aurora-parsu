-- Reverse 5. Alter Projects
ALTER TABLE public.projects DROP COLUMN IF EXISTS major_id;
ALTER TABLE public.projects DROP COLUMN IF EXISTS program_id;
ALTER TABLE public.projects DROP COLUMN IF EXISTS college_id;

-- Reverse 4. Alter Students
ALTER TABLE public.students DROP COLUMN IF EXISTS major_id;

-- Reverse 3. Drop Majors
DROP TABLE IF EXISTS public.majors;

-- Reverse 2. Alter Programs
ALTER TABLE public.programs DROP COLUMN IF EXISTS academic_level_id;
ALTER TABLE public.programs DROP COLUMN IF EXISTS college_id;
-- Re-enable NOT NULL on department_id (Warning: may fail if there are nulls)
ALTER TABLE public.programs ALTER COLUMN department_id SET NOT NULL;

-- Reverse 1. Drop Academic Levels
DROP TABLE IF EXISTS public.academic_levels;
