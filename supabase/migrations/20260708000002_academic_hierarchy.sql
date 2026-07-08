-- 1. Create Academic Levels table
CREATE TABLE IF NOT EXISTS public.academic_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_levels_select ON public.academic_levels FOR SELECT USING (true);
GRANT SELECT ON public.academic_levels TO anon, authenticated, service_role;

-- Insert defaults
INSERT INTO public.academic_levels (name) VALUES 
('Undergraduate'), 
('Graduate'), 
('Doctoral')
ON CONFLICT (name) DO NOTHING;

-- 2. Alter Programs to make department nullable and add college_id + academic_level
ALTER TABLE public.programs ALTER COLUMN department_id DROP NOT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS academic_level_id UUID REFERENCES public.academic_levels(id);

-- 3. Create Majors table
CREATE TABLE IF NOT EXISTS public.majors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
CREATE POLICY majors_select ON public.majors FOR SELECT USING (true);
GRANT SELECT ON public.majors TO anon, authenticated, service_role;

-- 4. Alter Students to add major_id
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES public.majors(id);

-- 5. Alter Projects to inherit full academic structure
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES public.majors(id);
