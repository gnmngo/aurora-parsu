-- ========================================================================================
-- PARTIDO STATE UNIVERSITY
-- College of Engineering and Computational Sciences
-- Department of Computational Sciences | Bachelor of Science in Information Technology
-- AURORA: Academic Unified Review, Observation, Rating, and Assessment System
-- ANNEX G.2: PRODUCTION DATABASE SCHEMA DDL SCRIPT
-- ========================================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role_enum AS ENUM ('student', 'adviser', 'panelist', 'coordinator', 'sys_admin', 'college_dean');
CREATE TYPE project_status_enum AS ENUM ('draft', 'under_review', 'scheduled', 'deliberation', 'completed', 'archived');
CREATE TYPE document_status_enum AS ENUM ('draft', 'under_review', 'changes_requested', 'endorsed', 'approved', 'rejected');
CREATE TYPE schedule_status_enum AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE evaluation_status_enum AS ENUM ('draft', 'submitted', 'locked');
CREATE TYPE verdict_enum AS ENUM ('approved', 'minor_revisions', 'major_revisions', 're_defense', 'failed');
CREATE TYPE annotation_severity_enum AS ENUM ('info', 'minor', 'major', 'critical');
CREATE TYPE annotation_status_enum AS ENUM ('open', 'addressed', 'resolved', 'verified');

-- 2. ACADEMIC ENTITIES & PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    department TEXT DEFAULT 'Department of Computational Sciences',
    college TEXT DEFAULT 'College of Engineering and Computational Sciences',
    campus TEXT DEFAULT 'Goa Campus',
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code user_role_enum UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id_number TEXT UNIQUE,
    program TEXT DEFAULT 'BSIT',
    year_level INT DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CAPSTONE PROJECTS & WORKFLOW STAGES
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    sequence_order INT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    abstract TEXT,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    current_stage_id UUID REFERENCES public.stages(id),
    status project_status_enum DEFAULT 'draft',
    similarity_index NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_role TEXT NOT NULL CHECK (member_role IN ('lead', 'member', 'adviser')),
    is_primary BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, profile_id)
);

-- 4. MANUSCRIPTS, VERSIONING & ANNOTATIONS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id),
    title TEXT NOT NULL,
    status document_status_enum DEFAULT 'draft',
    adviser_approval_status TEXT DEFAULT 'pending' CHECK (adviser_approval_status IN ('pending', 'approved', 'changes_requested')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    file_size_bytes BIGINT,
    is_current BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    highlight_coordinates JSONB NOT NULL, -- {left, top, width, height}
    selected_text TEXT,
    comment TEXT NOT NULL,
    severity annotation_severity_enum DEFAULT 'minor',
    rubric_criterion_id UUID,
    status annotation_status_enum DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.annotation_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES public.annotations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DEFENSE SCHEDULING & PANEL FORMATION
CREATE TABLE IF NOT EXISTS public.defense_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    room TEXT NOT NULL,
    building TEXT DEFAULT 'CECS Building',
    is_online BOOLEAN DEFAULT FALSE,
    meeting_url TEXT,
    duration_minutes INT DEFAULT 90,
    status schedule_status_enum DEFAULT 'scheduled',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.defense_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    panel_role TEXT NOT NULL CHECK (panel_role IN ('chair', 'member')),
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, stage_id, profile_id)
);

-- 6. ORAL DEFENSE APPLICATIONS (FORM DCS-CF-03)
CREATE TABLE IF NOT EXISTS public.defense_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id),
    form_code TEXT DEFAULT 'DCS-CF-03',
    defense_type TEXT DEFAULT 'Oral Defense',
    requirements_checklist JSONB NOT NULL,
    preferred_dates JSONB DEFAULT '[]'::jsonb,
    adviser_certification JSONB,
    status TEXT DEFAULT 'submitted_by_student' CHECK (status IN ('draft', 'submitted_by_student', 'certified_by_adviser', 'approved_by_chair', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, stage_id)
);

-- 7. RUBRICS, EVALUATIONS & CERTIFICATION (FORM DCS-CF-04)
CREATE TABLE IF NOT EXISTS public.rubric_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program TEXT DEFAULT 'BSIT',
    title TEXT NOT NULL,
    stage_id UUID REFERENCES public.stages(id),
    criteria JSONB NOT NULL, -- [{name, weight, description}]
    thresholds JSONB DEFAULT '{"passing_score": 75.0, "excellent_score": 90.0}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.stages(id),
    panelist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rubric_template_id UUID REFERENCES public.rubric_templates(id),
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score NUMERIC(5,2),
    weighted_score NUMERIC(5,2),
    verdict_code verdict_enum,
    panel_notes TEXT,
    recommendations TEXT,
    signature_image TEXT,
    signature_hash TEXT,
    certificate_serial TEXT UNIQUE,
    status evaluation_status_enum DEFAULT 'draft',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, stage_id, panelist_id)
);

-- 8. AUDIT LOGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id),
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ATOMIC CERTIFICATE SERIAL SEQUENCE & RPC
CREATE SEQUENCE IF NOT EXISTS certificate_serial_seq START 1;

CREATE OR REPLACE FUNCTION generate_certificate_serial()
RETURNS TEXT AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    next_val BIGINT;
BEGIN
    next_val := nextval('certificate_serial_seq');
    RETURN 'AURORA-' || current_year || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Projects viewable by members and faculty"
ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Evaluations viewable by panel and coordinator"
ON public.evaluations FOR SELECT TO authenticated USING (
    panelist_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.profile_id = auth.uid() AND r.code IN ('coordinator', 'sys_admin', 'college_dean'))
);

CREATE POLICY "Evaluators can sign only own evaluation"
ON public.evaluations FOR UPDATE TO authenticated USING (panelist_id = auth.uid());

CREATE POLICY "Audit logs insertable by system and readable by admin"
ON public.audit_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.profile_id = auth.uid() AND r.code IN ('sys_admin', 'college_dean'))
);
