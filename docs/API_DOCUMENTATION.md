# AURORA Database API Schema & Reference
**Partido State University – Goa Campus**

---

## 🔐 1. Authentication & RBAC

All client requests to Supabase utilize standard JSON Web Tokens (JWT). Client roles are verified at database RLS level using `has_role(role_code)` functions.

### User Profiles Registry
- **Table**: `public.profiles`
- **Fields**:
  - `id` UUID (Primary Key references auth.users)
  - `email` VARCHAR(255)
  - `first_name` VARCHAR(100)
  - `last_name` VARCHAR(100)
  - `status` user_status ('pending', 'approved', 'rejected')

---

## 📁 2. Projects & Submissions

### Projects Table
- **Table**: `public.projects`
- **Fields**:
  - `id` UUID (Primary Key)
  - `title` VARCHAR(500)
  - `student_id` UUID (Foreign Key references students)
  - `current_stage_id` UUID (Foreign Key references defense_stages)
  - `workflow_template_id` UUID (Workflow templates filter)

### Documents & Versions
- **Table**: `public.documents`
- **Fields**:
  - `id` UUID
  - `project_id` UUID
  - `stage_id` UUID
  - `status` VARCHAR(20) ('active', 'archived')
- **Table**: `public.document_versions`
  - `id` UUID
  - `document_id` UUID
  - `version_number` INT
  - `storage_path` TEXT (Path to file inside manuscripts private storage bucket)

---

## 🖋️ 3. Evaluations & Signatures

### Grading Rubrics
- **Table**: `public.rubric_templates`
- **Fields**:
  - `id` UUID
  - `project_id` UUID
  - `criteria` JSONB (List of weight structures)
  - `passing_score` DECIMAL

### Evaluations Table
- **Table**: `public.evaluations`
- **Fields**:
  - `id` UUID
  - `project_id` UUID
  - `panelist_id` UUID
  - `scores` JSONB
  - `total_score` DECIMAL
  - `verdict_code` VARCHAR(20) ('passed', 'passed_with_revisions', 'failed')
  - `certificate_serial` VARCHAR(100) (Cryptographic signature verify string)
