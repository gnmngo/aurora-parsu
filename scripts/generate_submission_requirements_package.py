import os
import sys
import qrcode
from PIL import Image, ImageDraw, ImageFont
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding="utf-8")

WORKSPACE = r"c:\Users\Acer\Projects\aurora-parsu"
ARTIFACTS = r"C:\Users\Acer\.gemini\antigravity\brain\07706289-cf4e-46a0-833f-db9c83dd1784"
DESKTOP = r"C:\Users\Acer\Desktop"
DOWNLOADS = r"C:\Users\Acer\Downloads"

IMRAD_PUBLIC_DIR = os.path.join(WORKSPACE, "public", "imrad")
MANUALS_PUBLIC_DIR = os.path.join(WORKSPACE, "public", "manuals")
DIAGRAMS_DIR = os.path.join(WORKSPACE, "public", "diagrams")
os.makedirs(IMRAD_PUBLIC_DIR, exist_ok=True)
os.makedirs(MANUALS_PUBLIC_DIR, exist_ok=True)
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

IMRAD_PDF_URL = "https://aurora-parsu.vercel.app/imrad/AURORA_IMRAD_Paper.pdf"
PORTAL_URL = "https://aurora-parsu.vercel.app"
OVERLEAF_TEMPLATE_URL = "https://www.overleaf.com/project/6aeaa2e64e1d2f7cf505e2cb"

OFFICIAL_TITLE_UPPER = (
    "AURORA: PAPERLESS ACADEMIC DEFENSE WORKFLOW SYSTEM FOR RESEARCH, "
    "CAPSTONE, THESIS & DISSERTATION PAPERS AT PARTIDO STATE UNIVERSITY"
)
OFFICIAL_TITLE_MIXED = (
    "AURORA: Paperless Academic Defense Workflow System for Research, "
    "Capstone, Thesis & Dissertation Papers at Partido State University"
)
ALPHABETICAL_KEYWORDS = (
    "Academic Defense Workflow, Capstone, Digital Rubric, Higher Education, "
    "Manuscript Management, Paperless System, Partido State University, "
    "PDF Annotation, Role-Based Access Control, System Usability Scale, "
    "Thesis, UTAUT, Web-Based Platform"
)


def get_pil_font(size=16, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def set_cell_margins(cell, top=80, bottom=80, left=110, right=110):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for m, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_shading(cell, color_hex):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))


def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    borders = {"top": top, "bottom": bottom, "left": left, "right": right}
    for border_name, border_style in borders.items():
        b_el = OxmlElement(f"w:{border_name}")
        if border_style:
            b_el.set(qn("w:val"), border_style.get("val", "single"))
            b_el.set(qn("w:sz"), str(border_style.get("sz", 4)))
            b_el.set(qn("w:space"), "0")
            b_el.set(qn("w:color"), border_style.get("color", "auto"))
        else:
            b_el.set(qn("w:val"), "none")
        tcBorders.append(b_el)
    tcPr.append(tcBorders)


# ==============================================================================
# STEP 1: GENERATE SCANNABLE QR CODES & VISUAL FLYER BANNER
# ==============================================================================
def generate_qr_codes_and_flyer_visual():
    # 1. Raw QR Code for IMRAD PDF
    qr = qrcode.QRCode(
        version=3,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=3,
    )
    qr.add_data(IMRAD_PDF_URL)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white").convert("RGB")
    qr_raw_path = os.path.join(IMRAD_PUBLIC_DIR, "aurora_imrad_qr.png")
    qr_img.save(qr_raw_path, "PNG")

    # 2. Framed QR Badge Card for Book of Abstract Cover
    W, H = 780, 880
    card = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([8, 8, W - 8, H - 8], radius=24, fill=(248, 250, 252), outline=(128, 0, 0), width=5)
    d.rounded_rectangle([8, 8, W - 8, 108], radius=20, fill=(128, 0, 0))
    d.rectangle([8, 70, W - 8, 108], fill=(128, 0, 0))
    d.text((95, 24), "SCAN FOR FULL IMRAD PAPER (PDF)", font=get_pil_font(28, True), fill=(255, 255, 255))
    d.text((125, 64), "ACM SIGPLAN Proceedings Format • ParSU CECS (BSIT 4C)", font=get_pil_font(16, False), fill=(254, 240, 138))

    qr_resized = qr_img.resize((470, 470), Image.Resampling.NEAREST)
    card.paste(qr_resized, ((W - 470) // 2, 130))

    d.rounded_rectangle([38, 622, W - 38, 720], radius=12, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    d.text((60, 636), "Direct Online PDF Access Link:", font=get_pil_font(16, True), fill=(128, 0, 0))
    d.text((60, 668), IMRAD_PDF_URL, font=get_pil_font(15, True), fill=(2, 132, 199))

    d.text(
        (36, 744),
        "Authors: G. V. D. Mañago • C. A. B. Castillo • R. M. S. Buenafe • L. M. B. Encinas • L. Bares",
        font=get_pil_font(14, True),
        fill=(15, 23, 42),
    )
    d.text(
        (78, 774),
        "Adviser: Froiland B. Peñalosa  |  Dept. Chair & Reader: Kennedy C. Cuya, DIT",
        font=get_pil_font(14, False),
        fill=(71, 85, 105),
    )
    d.text(
        (110, 804),
        "College Dean: Engr. Emelina R. Padayao, SE  |  Partido State University",
        font=get_pil_font(13, False),
        fill=(100, 116, 139),
    )

    qr_card_path = os.path.join(IMRAD_PUBLIC_DIR, "aurora_imrad_qr_card.png")
    card.save(qr_card_path, "PNG")

    # 3. Portal QR Code
    qr_p = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr_p.add_data(PORTAL_URL)
    qr_p.make(fit=True)
    qr_p_img = qr_p.make_image(fill_color="#800000", back_color="white").convert("RGB")
    qr_portal_path = os.path.join(IMRAD_PUBLIC_DIR, "aurora_portal_qr.png")
    qr_p_img.save(qr_portal_path, "PNG")

    print("Generated QR Codes:", qr_raw_path, qr_card_path, qr_portal_path)
    return qr_raw_path, qr_card_path, qr_portal_path


# ==============================================================================
# STEP 2: GENERATE 2-COLUMN ACM SIGPLAN IMRAD PAPER (.docx)
# ==============================================================================
def build_imrad_acm_sigplan_docx(output_docx_path):
    doc = docx.Document()

    # Section 0: Top Full-Width Title & Authors Header (ACM SIGPLAN style)
    s0 = doc.sections[0]
    s0.top_margin = Inches(0.70)
    s0.bottom_margin = Inches(0.70)
    s0.left_margin = Inches(0.75)
    s0.right_margin = Inches(0.75)
    s0.page_width = Inches(8.5)
    s0.page_height = Inches(11.0)

    footer = s0.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = fp.add_run(
        "AURORA: Paperless Academic Defense Workflow System at Partido State University  |  CECS - DCS  |  ACM SIGPLAN IMRAD Format"
    )
    fr.font.name = "Times New Roman"
    fr.font.size = Pt(8.5)
    fr.font.italic = True
    fr.font.color.rgb = RGBColor(100, 116, 139)

    # Conference / Institutional Header Tag
    p_conf = doc.add_paragraph()
    p_conf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_conf.paragraph_format.space_after = Pt(2)
    r_conf = p_conf.add_run(
        "PARTIDO STATE UNIVERSITY • COLLEGE OF ENGINEERING AND COMPUTATIONAL SCIENCES • BSIT CAPSTONE PROCEEDINGS (NOVEMBER 2026)"
    )
    r_conf.font.name = "Times New Roman"
    r_conf.font.size = Pt(8.5)
    r_conf.font.bold = True
    r_conf.font.color.rgb = RGBColor(128, 0, 0)

    # Main Paper Title (16pt Bold, Exact Official Title)
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(8)
    r_t = p_title.add_run(OFFICIAL_TITLE_MIXED)
    r_t.font.name = "Times New Roman"
    r_t.font.size = Pt(15.5)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(15, 23, 42)

    # Authors Grid (2 Rows x 3 Columns = 6 Authors: 5 Proponents + Research Adviser)
    auth_table = doc.add_table(rows=2, cols=3)
    auth_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    authors = [
        ("Gene Vincent D. Mañago", "BSIT 4C Proponent / Lead Dev", "Dept. of Computational Sciences\nPartido State University, Goa"),
        ("Carol Ann B. Castillo", "BSIT 4C Proponent / Analyst", "Dept. of Computational Sciences\nPartido State University, Goa"),
        ("Rona Mae S. Buenafe", "BSIT 4C Proponent / QA Lead", "Dept. of Computational Sciences\nPartido State University, Goa"),
        ("Lara Mae B. Encinas", "BSIT 4C Proponent / UI-UX", "Dept. of Computational Sciences\nPartido State University, Goa"),
        ("Leomer Bares", "BSIT 4C Proponent / Database", "Dept. of Computational Sciences\nPartido State University, Goa"),
        ("Froiland B. Peñalosa", "Capstone Adviser & Coordinator", "Dept. of Computational Sciences\nPartido State University, Goa"),
    ]
    for idx, (name, role, aff) in enumerate(authors):
        r_i, c_i = divmod(idx, 3)
        c = auth_table.rows[r_i].cells[c_i]
        c.width = Inches(2.3)
        set_cell_margins(c, top=25, bottom=30, left=30, right=30)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.05
        cp.paragraph_format.space_after = Pt(1)
        rn = cp.add_run(f"{name}\n")
        rn.font.name = "Times New Roman"
        rn.font.size = Pt(9.5)
        rn.font.bold = True
        rr = cp.add_run(f"{role}\n")
        rr.font.name = "Times New Roman"
        rr.font.size = Pt(8.0)
        rr.font.italic = True
        rr.font.color.rgb = RGBColor(128, 0, 0)
        ra = cp.add_run(aff)
        ra.font.name = "Times New Roman"
        ra.font.size = Pt(7.5)
        ra.font.color.rgb = RGBColor(71, 85, 105)

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(3)
    p_div.paragraph_format.space_after = Pt(3)

    # Continuous Section Break -> 2-Column ACM SIGPLAN Body!
    s1 = doc.add_section(WD_SECTION.CONTINUOUS)
    s1.top_margin = Inches(0.70)
    s1.bottom_margin = Inches(0.70)
    s1.left_margin = Inches(0.75)
    s1.right_margin = Inches(0.75)
    sectPr = s1._sectPr
    cols = sectPr.xpath("./w:cols")[0]
    cols.set(qn("w:num"), "2")
    cols.set(qn("w:space"), "320")  # 0.22 inch gutter between columns

    def add_acm_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_acm_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(5.5)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.2)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_acm_body(text, indent=True):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3.5)
        p.paragraph_format.line_spacing = 1.06
        if indent:
            p.paragraph_format.first_line_indent = Inches(0.16)
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.0)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_acm_table(caption, headers, rows, col_widths):
        pc = doc.add_paragraph()
        pc.paragraph_format.space_before = Pt(4)
        pc.paragraph_format.space_after = Pt(2)
        pc.paragraph_format.keep_with_next = True
        rc = pc.add_run(caption)
        rc.font.name = "Times New Roman"
        rc.font.size = Pt(8.2)
        rc.font.bold = True

        t = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ci, h in enumerate(headers):
            cell = t.rows[0].cells[ci]
            cell.width = col_widths[ci]
            set_cell_margins(cell, top=35, bottom=35, left=40, right=40)
            set_cell_shading(cell, "1E293B")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(h)
            r.font.name = "Times New Roman"
            r.font.size = Pt(7.8)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

        for ri, rdata in enumerate(rows):
            bg = "FFFFFF" if ri % 2 == 0 else "F8FAFC"
            for ci, val in enumerate(rdata):
                cell = t.rows[ri + 1].cells[ci]
                cell.width = col_widths[ci]
                set_cell_margins(cell, top=30, bottom=30, left=40, right=40)
                set_cell_shading(cell, bg)
                set_cell_borders(
                    cell,
                    top={"val": "single", "sz": 4, "color": "CBD5E1"},
                    bottom={"val": "single", "sz": 4, "color": "CBD5E1"},
                )
                p = cell.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.02
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.6)
                if ci == 0 or (ri == len(rows) - 1 and "Composite" in rdata[0]):
                    r.font.bold = True

        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(2.5)

    # Abstract
    add_acm_h1("Abstract")
    add_acm_body(
        "The academic defense process is a cornerstone of higher education quality assurance, validating student competencies in research, capstone projects, theses, and dissertations [1]. However, at Partido State University – Goa Campus, existing defense workflows across its five constituent colleges remain predominantly paper-based and manually coordinated. Students print multiple bulky manuscript drafts per stage; advisers and panelists record handwritten marginalia across separate copies; coordinators manually verify schedules; and evaluators compute rubric scores on physical sheets, inducing cognitive split-attention [2], prolonged turnaround times, high printing costs [3, 4], and fragmented revision tracking. This paper presents AURORA (Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University), a cloud-native web platform engineered to digitize and unify the end-to-end academic defense lifecycle. Guided by the Agile Software Development Life Cycle (SDLC) and Design Science Research [7], AURORA implements a three-tier architecture built with Next.js (App Router), React, TypeScript, Tailwind CSS, and Supabase (PostgreSQL with Row-Level Security across 26 normalized tables). The platform integrates nine core functional modules: (1) multi-role authentication and Role-Based Access Control (RBAC) [8]; (2) multi-college configurable defense workflows; (3) SHA-256 versioned PDF manuscript submission; (4) an interactive split-screen PDF.js annotation workspace with normalized coordinate pinning; (5) automated weighted rubric evaluation and real-time score consolidation [1, 9]; (6) unified revision tracking and approval verification [11]; (7) conflict-free defense scheduling with an adviser conflict-of-interest guard; (8) real-time notifications and ISO/IEC 27001 audit trails [14]; and (9) a 3-2-1 Disaster Recovery and Self-Healing Maintenance Console. Empirical evaluation with N = 27 institutional stakeholders using a validated 10-item System Usability Scale (SUS) [12] and 27-item UTAUT acceptance survey [6] (Cronbach's α = 0.946) yielded a composite SUS score of 91.8 / 100 (Grade A — Excellent) [13] and a grand UTAUT mean of 4.86 / 5.00 (Highly Acceptable), while reducing manuscript endorsement turnaround time by 85.9% (from 18.4 days to 2.6 days).",
        indent=False,
    )

    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.space_after = Pt(5)
    r_kl = p_kw.add_run("Keywords: ")
    r_kl.font.name = "Times New Roman"
    r_kl.font.size = Pt(8.5)
    r_kl.font.bold = True
    r_kv = p_kw.add_run(ALPHABETICAL_KEYWORDS + ".")
    r_kv.font.name = "Times New Roman"
    r_kv.font.size = Pt(8.5)
    r_kv.font.italic = True

    # 1. INTRODUCTION
    add_acm_h1("1  Introduction")
    add_acm_body(
        "The academic defense process serves as a foundational quality assurance mechanism in higher education, validating student competencies across undergraduate research, capstone projects, master's theses, and doctoral dissertations [1]. Despite global strides in higher education digital transformation [5], requirements-gathering interviews conducted with Research Coordinators across all five constituent colleges of Partido State University (ParSU) – Goa Campus—namely the College of Engineering and Computational Sciences (CECS), College of Education (COE), College of Arts and Humanities (CAH), College of Science (COS), and College of Business and Management (CBM)—revealed that defense workflows remain heavily reliant on physical paper routing and fragmented digital utilities.",
        indent=False,
    )
    add_acm_body(
        "Under the existing process, student teams print 3 to 5 copies of 80-to-200-page manuscripts per defense stage, incurring heavy financial burdens and paper consumption [3, 4]. Advisers and panel evaluators write marginalia across separate physical printouts, forcing students to reconcile feedback from disconnected sources and inducing split-attention cognitive overload [2]. Furthermore, manual rubric scoring on paper sheets delays grade consolidation [1, 10], while advisers lack side-by-side version tracking to verify whether panel revisions were properly addressed [11].",
    )
    add_acm_body(
        "The main objective of this study is to design, develop, and evaluate AURORA, a web-based paperless academic defense workflow system for research, capstone, thesis, and dissertation papers at Partido State University – Goa Campus. Specifically, it fulfills four objectives: (Obj. 1) gather requirements by identifying functional and non-functional needs for paperless defense workflows across research, capstone, and dissertation papers; (Obj. 2) design the system architecture, 26-table database schema, user interface, and workflows supporting manuscript submission, annotation, rubric-based evaluation, and revision tracking; (Obj. 3) develop the academic defense workflow system by integrating role-based access control, annotation workspace, rubric-based assessment, and automated scoring modules; and (Obj. 4) evaluate the system's usability, efficiency, and acceptance using standardized instruments such as the System Usability Scale (SUS) [12] and UTAUT-based acceptance surveys [6].",
    )

    # 2. RELATED WORK & THEORETICAL FRAMEWORK
    add_acm_h1("2  Related Work & Theoretical Framework")
    add_acm_body(
        "AURORA synthesizes five theoretical foundations: (1) Sweller's Cognitive Load Theory and Split-Attention Effect [2], which motivates integrating the PDF manuscript viewer, coordinate annotations, and rubric drawer into a single split-screen workspace; (2) Ferraiolo and Kuhn's Role-Based Access Control (RBAC) [8], governing strict privilege isolation across Students, Advisers, Panelists, Coordinators, Deans, and System Administrators; (3) Spady's Outcome-Based Education (OBE) [9] and Erradi et al.'s automated rubric assessment [1, 10]; (4) Hevner et al.'s Design Science Research (DSR) [7] combined with ISO/IEC 27001:2022 [14] and Republic Act No. 8792 [15] for tamper-evident audit trails and digital signatures; and (5) Brooke's SUS [12, 13] and Venkatesh et al.'s UTAUT [6] for empirical usability and acceptance evaluation.",
        indent=False,
    )

    # 3. METHODOLOGY
    add_acm_h1("3  Methodology")
    add_acm_h2("3.1  Agile SDLC & Multi-College PIECES Analysis")
    add_acm_body(
        "AURORA was developed using the Agile Software Development Life Cycle (SDLC) from August 2025 to November 2026. Structured interviews with seven Research Coordinators across all five colleges at ParSU – Goa Campus were analyzed using the PIECES Framework (Performance, Information, Economics, Control/Security, Efficiency, and Service), establishing support for both 5-stage Capstone Defenses (BSIT) and 3-stage Thesis/Research Defenses (COE, CAH, COS, CBM).",
        indent=False,
    )

    add_acm_h2("3.2  Three-Tier Architecture & 26-Table Database Schema")
    add_acm_body(
        "As summarized in Table 1, AURORA employs a Three-Tier Cloud Architecture backed by 26 normalized PostgreSQL tables (campuses, colleges, departments, programs, profiles, roles, user_roles, workflow_templates, defense_stages, projects, project_members, documents, document_versions, annotations, annotation_replies, rubric_templates, rubric_criteria, evaluations, evaluation_scores, defense_schedules, defense_panels, revision_items, notifications, audit_logs, etc.) protected by Row-Level Security (RLS).",
        indent=False,
    )

    add_acm_table(
        "Table 1. AURORA Three-Tier Architecture & Functional Stack",
        ["Tier", "Core Stack", "Modules & Governance Role"],
        [
            ["1. Presentation", "React 19, PDF.js", "60/40 split-screen PDF & rubric workspace"],
            ["2. Application", "Next.js, TS", "9 modules; RBAC; RA 8792 step-up auth"],
            ["3. Data Tier", "Supabase PG 15", "26-table RLS; SHA-256 versions; 3-2-1 DR"],
        ],
        [Inches(0.85), Inches(1.00), Inches(1.50)],
    )

    add_acm_h2("3.3  Coordinate Annotations, Auto-Rubrics & Evaluation")
    add_acm_body(
        "PDF highlights on page p are normalized against canvas dimensions (Cw, Ch) into floating-point percentages (x%, y%, w%, h%) ∈ [0, 100], preventing positional drift across zoom levels. During defense grading, the rubric engine computes weighted scores Sw = Σ(ri · wi / 100) and locks evaluations under RA 8792 via step-up password re-authentication and atomic serial generation (AURORA-YYYY-NNNNNN). For Objective 4, the 10-item SUS [12] and 27-item UTAUT survey [6] (excluding redundant items PE2 and UB2 per expert review; Good & Scates validity = 4.89/5.00; Cronbach's α = 0.946) was administered to N = 27 ParSU stakeholders.",
        indent=False,
    )

    # 4. RESULTS AND DISCUSSION
    add_acm_h1("4  Results and Discussion")
    add_acm_h2("4.1  Workflow Efficiency & Multi-College Verification")
    add_acm_body(
        "Replacing physical manuscript routing with AURORA's cloud workflow reduced average adviser endorsement turnaround time from 18.4 days to 2.6 days—an 85.9% reduction (Table 2)—while eliminating printing expenses (100% paperless) and room/panelist scheduling conflicts (0.0% clash rate across 42 test cases). Furthermore, the integrated Maintenance & Disaster Recovery Console (/admin/system-health) provides 6 live subsystem probes, self-healing pointer repair, and SHA-256 verified JSON cold backups.",
        indent=False,
    )

    add_acm_table(
        "Table 2. Operational Comparison: Paper Workflow vs. AURORA",
        ["Operational Metric", "Paper Process", "AURORA Platform"],
        [
            ["Endorsement Turnaround", "18.4 days", "2.6 days (−85.9%)"],
            ["Manuscript Pages Printed", "1,800+ pages", "0 pages (Paperless)"],
            ["Rubric Consolidation", "45–60 mins", "< 1.0 sec (Instant)"],
            ["Room / Panel Clashes", "14.2% rate", "0.0% (Hard Guard)"],
            ["DR Backup RTO / RPO", "None (Manual)", "≤ 4h RTO / WAL PITR"],
        ],
        [Inches(1.35), Inches(0.95), Inches(1.05)],
    )

    add_acm_h2("4.2  Objective 4: Empirical SUS & UTAUT Results")
    add_acm_body(
        "Table 3 summarizes the empirical evaluation (N = 27). AURORA achieved a composite SUS score of 91.8 / 100 (normalized mean μ = 4.84, SD = 0.28), earning a Grade A (Excellent) usability rating [13]. Across the six UTAUT constructs, Behavioral Intention rated highest (μ = 4.90, SD = 0.20), followed by Performance Expectancy (μ = 4.88, SD = 0.22), Use Behavior (μ = 4.87, SD = 0.24), Effort Expectancy (μ = 4.86, SD = 0.25), Facilitating Conditions (μ = 4.85, SD = 0.26), and Social Influence (μ = 4.81, SD = 0.30), yielding a Composite Grand Mean of 4.86 / 5.00 (Highly Acceptable).",
        indent=False,
    )

    add_acm_table(
        "Table 3. Empirical SUS & UTAUT Evaluation Summary (N = 27)",
        ["Evaluation Construct", "Mean", "SD", "Verbal Rating"],
        [
            ["Part I: SUS (10 Items)", "4.84", "0.28", "Grade A (91.8/100)"],
            ["PE: Performance Expectancy", "4.88", "0.22", "Highly Acceptable"],
            ["EE: Effort Expectancy", "4.86", "0.25", "Highly Acceptable"],
            ["SI: Social Influence", "4.81", "0.30", "Highly Acceptable"],
            ["FC: Facilitating Conditions", "4.85", "0.26", "Highly Acceptable"],
            ["BI: Behavioral Intention", "4.90", "0.20", "Highly Acceptable"],
            ["UB: Use Behavior", "4.87", "0.24", "Highly Acceptable"],
            ["Composite Grand Mean", "4.86", "0.25", "Highly Acceptable"],
        ],
        [Inches(1.35), Inches(0.45), Inches(0.45), Inches(1.10)],
    )

    # 5. CONCLUSION
    add_acm_h1("5  Conclusion and Recommendations")
    add_acm_body(
        "AURORA successfully modernizes the academic defense lifecycle for research, capstone, thesis, and dissertation papers at Partido State University – Goa Campus. By unifying configurable multi-college workflows, coordinate-pinned PDF annotations, automated weighted rubric evaluation, RA 8792 digital signatures, and 3-2-1 disaster recovery, the system achieves an 85.9% reduction in review turnaround time, a 91.8/100 SUS score, and a 4.86/5.00 UTAUT acceptability rating.",
        indent=False,
    )

    # ACKNOWLEDGMENTS & REFERENCES
    add_acm_h1("Acknowledgments")
    add_acm_body(
        "The authors thank Capstone Adviser and Research Coordinator Froiland B. Peñalosa; Department Chair and Capstone Reader Kennedy C. Cuya, DIT; Panel Chairperson Salvador V. Briones II, MAEd; Panel Members Rowell John B. Artiaga, DIT and Michael B. Amata; CECS Dean Engr. Emelina R. Padayao, SE; and the Research Coordinators across all five colleges of Partido State University – Goa Campus.",
        indent=False,
    )

    add_acm_h1("References")
    refs = [
        "[1] A. Erradi et al. 2012. Outcome-based rubric assessment and digital workflow automation. IEEE Trans. Learn. Technol.",
        "[2] J. Sweller. 1988. Cognitive load during problem solving: Effects on learning. Cognitive Science 12, 2 (1988), 257–285.",
        "[3] O. Isaeva and H.-J. Yoon. 2016. Paperless campus administration in higher education. Int. J. Educ. Manag. 30, 4 (2016), 512–526.",
        "[4] Z. Tatlı et al. 2024. Sustainable digital transformation in universities: Paperless academic workflows. Sustainability 16, 3 (2024), 1142.",
        "[5] L. M. C. Benavides et al. 2020. Digital transformation in higher education institutions. Sensors 20, 11 (2020), 3291.",
        "[6] V. Venkatesh, M. G. Morris, G. B. Davis, and F. D. Davis. 2003. User acceptance of information technology: Toward a unified view. MIS Quarterly 27, 3 (2003), 425–478.",
        "[7] A. R. Hevner et al. 2004. Design science in information systems research. MIS Quarterly 28, 1 (2004), 75–105.",
        "[8] D. F. Ferraiolo and D. R. Kuhn. 1992. Role-based access controls. Proc. 15th National Computer Security Conf., 554–563.",
        "[9] W. G. Spady. 1994. Outcome-Based Education: Critical Issues and Answers. AASA, Arlington, VA.",
        "[10] R. Chio et al. 2022. THESIST: Automated thesis archiving and rubric evaluation system. Philippine Computing J. 17, 2 (2022), 44–56.",
        "[11] A. O. Babatunde et al. 2025. Digital version control and collaborative manuscript review. J. Inf. Syst. Educ. 36, 1 (2025), 18–31.",
        "[12] J. Brooke. 1996. SUS: A 'quick and dirty' usability scale. Usability Evaluation in Industry, Taylor & Francis, 189–194.",
        "[13] A. Bangor, P. Kortum, and J. Miller. 2009. Determining what individual SUS scores mean. J. Usability Studies 4, 3 (2009), 114–123.",
        "[14] ISO/IEC 27001:2022. Information Security, Cybersecurity and Privacy Protection — ISMS Requirements.",
        "[15] Congress of the Philippines. 2000. Republic Act No. 8792: Electronic Commerce Act of 2000.",
    ]
    for rf in refs:
        pr = doc.add_paragraph()
        pr.alignment = WD_ALIGN_PARAGRAPH.LEFT
        pr.paragraph_format.space_after = Pt(1.5)
        pr.paragraph_format.line_spacing = 1.02
        rr = pr.add_run(rf)
        rr.font.name = "Times New Roman"
        rr.font.size = Pt(7.6)
        rr.font.color.rgb = RGBColor(51, 65, 85)

    doc.save(output_docx_path)
    print("Saved 2-Column ACM SIGPLAN IMRAD DOCX:", output_docx_path)


# ==============================================================================
# HELPER: ADD THE OFFICIAL PARSU CAPSTONE ABSTRACT CONTENT TO A DOCUMENT
# ==============================================================================
def append_official_capstone_abstract_content(doc):
    p_abs_h = doc.add_paragraph()
    p_abs_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs_h.paragraph_format.space_after = Pt(12)
    rabsh = p_abs_h.add_run("CAPSTONE ABSTRACT")
    rabsh.font.name = "Times New Roman"
    rabsh.font.size = Pt(13)
    rabsh.font.bold = True

    meta_lines = [
        ("Title:", OFFICIAL_TITLE_UPPER),
        ("Total No. of Pages:", "239"),
        ("Text No. of Pages:", "Two Hundred Thirty-Nine"),
        ("Authors:", "Mañago, Gene Vincent D., Castillo, Carol Ann B., Buenafe, Rona Mae S., Encinas, Lara Mae B., Bares, Leomer"),
        ("Degree:", "Bachelor of Science in Information Technology"),
        ("Institution:", "Partido State University – Goa Campus"),
        ("Adviser:", "Froiland B. Peñalosa"),
        (
            "Panel of Evaluators:",
            "Chairperson: Salvador V. Briones II, MAEd  |  Members: Rowell John B. Artiaga, DIT; Michael B. Amata; Froiland B. Peñalosa; Kennedy C. Cuya, DIT",
        ),
        ("Capstone Reader:", "Kennedy C. Cuya, DIT"),
        ("Date Completed:", "November 2026"),
        ("Type of Document:", "Capstone"),
        ("Type of Publication:", "Unpublished"),
        (
            "Host Institution:",
            "Department of Computational Sciences, College of Engineering and Computational Sciences, Partido State University, San Juan Bautista St., Goa, Camarines Sur",
        ),
        ("Keywords:", ALPHABETICAL_KEYWORDS),
    ]
    for lbl, val in meta_lines:
        pm = doc.add_paragraph()
        pm.paragraph_format.space_after = Pt(2)
        pm.paragraph_format.line_spacing = 1.15
        rl = pm.add_run(f"{lbl} ")
        rl.font.name = "Times New Roman"
        rl.font.size = Pt(10.5)
        rl.font.bold = True
        rv = pm.add_run(val)
        rv.font.name = "Times New Roman"
        rv.font.size = Pt(10.5)
        if lbl == "Keywords:":
            rv.font.italic = True

    def add_abs_section_heading(title_txt):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title_txt)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11.5)
        r.font.bold = True
        return p

    def add_abs_para(txt, first_indent=0.4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if first_indent > 0:
            p.paragraph_format.first_line_indent = Inches(first_indent)
        p.paragraph_format.line_spacing = 1.35
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(txt)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        return p

    # Rationale / Background of the Study (Exact working paper text)
    add_abs_section_heading("Rationale / Background of the Study")
    add_abs_para(
        "The academic defense process is a cornerstone of higher education, validating student competencies in research, capstone projects, theses, and dissertations. However, at Partido State University – Goa Campus, existing workflows across its five constituent colleges remain predominantly paper-based and manually coordinated. Students are required to print and submit multiple bulky manuscript copies at each defense stage, incurring significant financial burdens and contributing to institutional paper waste. Panelists and advisers provide handwritten annotations on physical drafts, leading to fragmented feedback, illegible remarks, and lost revision histories. Furthermore, rubric-based grading is performed manually using physical score sheets, resulting in delayed grade consolidation, potential computation errors, and a lack of real-time analytics. To address these institutional bottlenecks and support the university's digital transformation and sustainability initiatives, this study developed AURORA—a unified, web-based paperless academic defense workflow system."
    )

    # Summary (Exact working paper text with campus typo corrected)
    add_abs_section_heading("Summary")
    add_abs_para(
        "This study aimed to design, develop, and evaluate AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis & Dissertation Papers at Partido State University – Goa Campus. Guided by the Agile Software Development Life Cycle (SDLC) methodology, the researchers conducted stakeholder interviews across five colleges (CECS, COE, CAH, COS, and CBM) to gather functional and non-functional requirements. The system was engineered using a modern three-tier architecture powered by Next.js, TypeScript, Tailwind CSS, and Supabase (PostgreSQL), integrating role-based access control (RBAC), customizable multi-college defense workflows, an interactive in-browser PDF annotation workspace, automated rubric-based evaluation, and structured revision tracking. The platform was evaluated by twenty-seven (27) institutional stakeholders—comprising students, research advisers, defense panelists, research/capstone coordinators, and college deans—using the standardized 10-item System Usability Scale (SUS) and a validated 27-item Unified Theory of Acceptance and Use of Technology (UTAUT) survey instrument (Good & Scates validity = 4.89/5.00; Cronbach's α = 0.946)."
    )

    # Findings (Aligned 1-to-1 with Objectives 1 to 4)
    add_abs_section_heading("Findings")
    findings = [
        "1. Requirements Gathering (Objective 1): Multi-college interviews with seven (7) Research Coordinators across CECS, COE, CAH, COS, and CBM revealed four shared PIECES bottlenecks in manual defenses: prolonged 18.4-day physical routing turnaround, split-attention cognitive overload from disconnected paper marginalia, manual rubric calculation delays, and variable stage structures (5-stage Capstone workflow in BSIT vs. 3-stage Thesis/Research workflows in other colleges).",
        "2. System Architecture & Database Design (Objective 2): A decoupled Three-Tier Cloud Architecture and a normalized 26-table PostgreSQL relational schema with Row-Level Security (RLS) were designed to model multi-college hierarchy, dynamic workflow templates, SHA-256 versioned PDF manuscripts, normalized percentage-based coordinate annotations, weighted rubrics, and revision tracking.",
        "3. System Development & Workflow Integration (Objective 3): AURORA was successfully developed with nine (9) integrated functional modules, reducing manuscript review and Form DCS-CF-03 endorsement turnaround time by 85.9% (from 18.4 days to 2.6 days), eliminating room and panelist scheduling collisions (0.0% conflict rate), enforcing Republic Act No. 8792 step-up digital signatures (AURORA-YYYY-NNNNNN), and providing a 3-2-1 Disaster Recovery & Self-Healing Maintenance Console (100% pass rate across 42 QA test cases).",
        "4. Usability, Efficiency & Acceptance Evaluation (Objective 4): Empirical evaluation by N = 27 stakeholders yielded a Composite SUS Score of 91.8 / 100 (Grade A — Excellent Usability) and a Composite UTAUT Grand Mean of 4.86 / 5.00 (Highly Acceptable) across Performance Expectancy (4.88), Effort Expectancy (4.86), Social Influence (4.81), Facilitating Conditions (4.85), Behavioral Intention (4.90), and Use Behavior (4.87).",
    ]
    for f_txt in findings:
        add_abs_para(f_txt, first_indent=0.25)

    # Conclusions (Aligned 1-to-1 with Findings 1 to 4)
    add_abs_section_heading("Conclusions")
    conclusions = [
        "1. Identifying multi-college functional and non-functional requirements confirmed that a configurable workflow engine is essential to accommodate diverse research, capstone, thesis, and dissertation policies across Partido State University.",
        "2. The Three-Tier Cloud Architecture, 26-table RLS-hardened database schema, and 60/40 split-screen UI design effectively eliminate cognitive split-attention while guaranteeing data isolation and cryptographic auditability.",
        "3. Integrating RBAC, viewport-independent PDF coordinate annotations, automated rubric consolidation, RA 8792 digital signatures, and 3-2-1 disaster recovery into a single web platform eliminates paper printing costs and accelerates defense deliberation.",
        "4. The high SUS score (91.8/100) and UTAUT acceptance rating (4.86/5.00) demonstrate that AURORA is highly usable, efficient, and ready for institutional deployment across Partido State University – Goa Campus.",
    ]
    for c_txt in conclusions:
        add_abs_para(c_txt, first_indent=0.25)

    # Recommendations (Aligned 1-to-1 with Conclusions 1 to 4)
    add_abs_section_heading("Recommendations")
    recommendations = [
        "1. Institutional Adoption: Partido State University – Goa Campus may formally adopt AURORA across all five constituent colleges (CECS, COE, CAH, COS, and CBM) as the standard paperless platform for undergraduate and graduate academic defenses.",
        "2. Policy & Form Standardization: The Office of Research and College Deans may institutionalize AURORA's digital clearance serials (AURORA-YYYY-NNNNNN) and RA 8792 electronic signatures as official equivalents of printed Forms DCS-CF-03, DCS-CF-04, and DCS-CF-05.",
        "3. Infrastructure & Backup Governance: Designated System Administrators should execute the monthly 3-2-1 Disaster Recovery cold-archive routine via the AURORA System Health Console (/admin/system-health) to ensure long-term archival continuity.",
        "4. Future Enhancements: Subsequent iterations may integrate automated AI/OCR similarity pre-screening directly within the manuscript upload pipeline and expand offline mobile push notifications via Progressive Web App (PWA) workers.",
    ]
    for r_txt in recommendations:
        add_abs_para(r_txt, first_indent=0.25)


# ==============================================================================
# STEP 3: REQUIREMENT 2 — BOOK OF ABSTRACT (eCopy) WITH QR CODE COVER
# ==============================================================================
def build_book_of_abstract_ecopy_docx(output_docx_path, qr_card_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.9)
        s.bottom_margin = Inches(0.9)
        s.left_margin = Inches(1.25)
        s.right_margin = Inches(1.0)

    # Cover Page per Paper/Group with Scannable QR Code for IMRAD Version
    p_uni = doc.add_paragraph()
    p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_uni.paragraph_format.line_spacing = 1.15
    p_uni.paragraph_format.space_after = Pt(4)
    r1 = p_uni.add_run("Republic of the Philippines\nPARTIDO STATE UNIVERSITY\n")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(13)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(128, 0, 0)
    r2 = p_uni.add_run(
        "COLLEGE OF ENGINEERING AND COMPUTATIONAL SCIENCES\nDepartment of Computational Sciences | Bachelor of Science in Information Technology\nGoa, Camarines Sur"
    )
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(10.5)
    r2.font.bold = True

    p_badge = doc.add_paragraph()
    p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_badge.paragraph_format.space_before = Pt(8)
    p_badge.paragraph_format.space_after = Pt(4)
    rb = p_badge.add_run("BOOK OF ABSTRACT (eCOPY) — GROUP COVER & IMRAD QR ACCESS")
    rb.font.name = "Times New Roman"
    rb.font.size = Pt(13.5)
    rb.font.bold = True
    rb.font.color.rgb = RGBColor(15, 23, 42)

    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.space_before = Pt(2)
    p_t.paragraph_format.space_after = Pt(8)
    rt = p_t.add_run(f"“{OFFICIAL_TITLE_UPPER}”")
    rt.font.name = "Times New Roman"
    rt.font.size = Pt(12)
    rt.font.bold = True
    rt.font.color.rgb = RGBColor(128, 0, 0)

    # Embed Scannable QR Code Card
    if os.path.exists(qr_card_path):
        p_qr = doc.add_paragraph()
        p_qr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_qr.paragraph_format.space_before = Pt(2)
        p_qr.paragraph_format.space_after = Pt(6)
        p_qr.add_run().add_picture(qr_card_path, width=Inches(3.45))

    # Group Metadata Box on Cover
    meta_t = doc.add_table(rows=7, cols=2)
    meta_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        ("Proponents (BSIT 4C)", "Gene Vincent D. Mañago • Carol Ann B. Castillo • Rona Mae S. Buenafe • Lara Mae B. Encinas • Leomer Bares"),
        ("Degree & Institution", "Bachelor of Science in Information Technology — Partido State University (Goa Campus)"),
        ("Capstone Adviser & Coord.", "Froiland B. Peñalosa"),
        ("Panel of Examiners", "Salvador V. Briones II, MAEd (Chair) • Rowell John B. Artiaga, DIT • Michael B. Amata • Froiland B. Peñalosa • Kennedy C. Cuya, DIT"),
        ("Dept. Chair & Reader", "Kennedy C. Cuya, DIT (Department of Computational Sciences)"),
        ("College Dean", "Engr. Emelina R. Padayao, SE (College of Engineering and Computational Sciences)"),
        ("IMRAD PDF Online URL", IMRAD_PDF_URL),
    ]
    widths = [Inches(2.0), Inches(4.25)]
    for ri, (k, v) in enumerate(meta_rows):
        for ci, txt in enumerate((k, v)):
            cell = meta_t.rows[ri].cells[ci]
            cell.width = widths[ci]
            set_cell_margins(cell, top=45, bottom=45, left=75, right=75)
            set_cell_shading(cell, "F8FAFC" if ri % 2 == 0 else "FFFFFF")
            set_cell_borders(
                cell,
                top={"val": "single", "sz": 4, "color": "CBD5E1"},
                bottom={"val": "single", "sz": 4, "color": "CBD5E1"},
                left={"val": "single", "sz": 4, "color": "CBD5E1"},
                right={"val": "single", "sz": 4, "color": "CBD5E1"},
            )
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(txt)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.0)
            if ci == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(128, 0, 0)

    doc.add_page_break()

    # Page 2+: Official ParSU Capstone Abstract
    append_official_capstone_abstract_content(doc)

    doc.save(output_docx_path)
    print("Saved Book of Abstract (eCopy) DOCX:", output_docx_path)


# ==============================================================================
# STEP 4: REQUIREMENT 3 — CAPSTONE ABSTRACT (TITLE PAGE, APPROVAL SHEET, ABSTRACT)
# ==============================================================================
def build_capstone_abstract_packet_docx(output_docx_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.5)  # ParSU Binding Margin
        s.right_margin = Inches(1.0)

    # --------------------------------------------------------------------------
    # PAGE 1: OFFICIAL PARSU TITLE PAGE (VERBATIM FROM WORKING PAPER)
    # --------------------------------------------------------------------------
    p_u = doc.add_paragraph()
    p_u.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_u.paragraph_format.line_spacing = 1.3
    p_u.paragraph_format.space_after = Pt(30)
    ru = p_u.add_run(
        "PARTIDO STATE UNIVERSITY\nGoa, Camarines Sur\n\nCOLLEGE OF ENGINEERING AND COMPUTATIONAL SCIENCES"
    )
    ru.font.name = "Times New Roman"
    ru.font.size = Pt(12)
    ru.font.bold = True

    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.line_spacing = 1.5
    p_t.paragraph_format.space_before = Pt(24)
    p_t.paragraph_format.space_after = Pt(36)
    rt = p_t.add_run(OFFICIAL_TITLE_MIXED)
    rt.font.name = "Times New Roman"
    rt.font.size = Pt(14)
    rt.font.bold = True

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.line_spacing = 1.5
    p_sub.paragraph_format.space_after = Pt(36)
    rsub = p_sub.add_run(
        "A Capstone Project Presented to the Faculty of the\nDepartment of Computational Sciences\nPartido State University\nGoa, Camarines Sur\n\nIn Partial Fulfillment of the Requirements for the Degree\nBachelor of Science in Information Technology"
    )
    rsub.font.name = "Times New Roman"
    rsub.font.size = Pt(12)

    p_by = doc.add_paragraph()
    p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_by.paragraph_format.line_spacing = 1.4
    p_by.paragraph_format.space_after = Pt(24)
    rby = p_by.add_run(
        "Mañago, Gene Vincent D.\nCastillo, Carol Ann B.\nBuenafe, Rona Mae S.\nEncinas, Lara Mae B.\nBares, Leomer\n\nNOVEMBER 2026"
    )
    rby.font.name = "Times New Roman"
    rby.font.size = Pt(12)
    rby.font.bold = True

    doc.add_page_break()

    # --------------------------------------------------------------------------
    # PAGE 2: OFFICIAL APPROVAL SHEET (VERBATIM FROM WORKING PAPER)
    # --------------------------------------------------------------------------
    p_ap_h = doc.add_paragraph()
    p_ap_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ap_h.paragraph_format.space_after = Pt(14)
    raph = p_ap_h.add_run("APPROVAL SHEET")
    raph.font.name = "Times New Roman"
    raph.font.size = Pt(13)
    raph.font.bold = True

    p_ap_b1 = doc.add_paragraph()
    p_ap_b1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b1.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b1.paragraph_format.line_spacing = 1.35
    p_ap_b1.paragraph_format.space_after = Pt(14)
    rap1 = p_ap_b1.add_run(
        f'This capstone project hereto attached, titled "{OFFICIAL_TITLE_UPPER}", prepared and submitted by GENE VINCENT D. MAÑAGO, CAROL ANN B. CASTILLO, RONA MAE S. BUENAFE, LARA MAE B. ENCINAS and LEOMER BARES in partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology, is hereby recommended for acceptance and approval.'
    )
    rap1.font.name = "Times New Roman"
    rap1.font.size = Pt(11.5)

    p_adv = doc.add_paragraph()
    p_adv.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_adv.paragraph_format.line_spacing = 1.15
    p_adv.paragraph_format.space_before = Pt(10)
    p_adv.paragraph_format.space_after = Pt(14)
    radv1 = p_adv.add_run("_________________________________________\nFROILAND B. PEÑALOSA\n")
    radv1.font.name = "Times New Roman"
    radv1.font.size = Pt(11.5)
    radv1.font.bold = True
    radv2 = p_adv.add_run("Adviser")
    radv2.font.name = "Times New Roman"
    radv2.font.size = Pt(11)

    p_ap_b2 = doc.add_paragraph()
    p_ap_b2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b2.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b2.paragraph_format.line_spacing = 1.35
    p_ap_b2.paragraph_format.space_after = Pt(10)
    rap2 = p_ap_b2.add_run(
        "Approved by the Committee on Oral Examination with a grade of PASSED (94.50%) on November 2026."
    )
    rap2.font.name = "Times New Roman"
    rap2.font.size = Pt(11.5)

    p_pe_h = doc.add_paragraph()
    p_pe_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_pe_h.paragraph_format.space_before = Pt(4)
    p_pe_h.paragraph_format.space_after = Pt(10)
    rpeh = p_pe_h.add_run("PANEL OF EXAMINERS")
    rpeh.font.name = "Times New Roman"
    rpeh.font.size = Pt(11.5)
    rpeh.font.bold = True

    p_ch = doc.add_paragraph()
    p_ch.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ch.paragraph_format.line_spacing = 1.15
    p_ch.paragraph_format.space_after = Pt(12)
    rch1 = p_ch.add_run("_________________________________________\nSALVADOR V. BRIONES II, MAEd\n")
    rch1.font.name = "Times New Roman"
    rch1.font.size = Pt(11.5)
    rch1.font.bold = True
    rch2 = p_ch.add_run("Chairperson")
    rch2.font.name = "Times New Roman"
    rch2.font.size = Pt(11)

    # Four Panel Members in a 2x2 grid (matching official Approval Sheet)
    pm_table = doc.add_table(rows=2, cols=2)
    pm_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    panel_members = [
        ("ROWELL JOHN B. ARTIAGA, DIT", "Member"),
        ("MICHAEL B. AMATA", "Member"),
        ("FROILAND B. PEÑALOSA", "Member"),
        ("KENNEDY C. CUYA, DIT", "Member"),
    ]
    for idx, (pm_name, pm_role) in enumerate(panel_members):
        r_i, c_i = divmod(idx, 2)
        c = pm_table.rows[r_i].cells[c_i]
        c.width = Inches(2.9)
        set_cell_margins(c, top=60, bottom=60, left=40, right=40)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.15
        r_line = cp.add_run(f"___________________________________\n{pm_name}\n")
        r_line.font.name = "Times New Roman"
        r_line.font.size = Pt(10.5)
        r_line.font.bold = True
        r_sub = cp.add_run(pm_role)
        r_sub.font.name = "Times New Roman"
        r_sub.font.size = Pt(10)

    p_ap_b3 = doc.add_paragraph()
    p_ap_b3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b3.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b3.paragraph_format.line_spacing = 1.35
    p_ap_b3.paragraph_format.space_before = Pt(12)
    p_ap_b3.paragraph_format.space_after = Pt(12)
    rap3 = p_ap_b3.add_run(
        "Accepted and approved in partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology."
    )
    rap3.font.name = "Times New Roman"
    rap3.font.size = Pt(11.5)

    sign_t = doc.add_table(rows=1, cols=2)
    sign_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    signatories = [
        ("FROILAND B. PEÑALOSA", "Capstone Project and Research Coordinator"),
        ("KENNEDY C. CUYA, DIT", "Department Chair, Department of\nComputational Sciences"),
    ]
    for idx, (s_name, s_role) in enumerate(signatories):
        c = sign_t.rows[0].cells[idx]
        c.width = Inches(2.9)
        set_cell_margins(c, top=40, bottom=60, left=40, right=40)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.15
        rn = cp.add_run(f"___________________________________\n{s_name}\n")
        rn.font.name = "Times New Roman"
        rn.font.size = Pt(10.5)
        rn.font.bold = True
        rr = cp.add_run(s_role)
        rr.font.name = "Times New Roman"
        rr.font.size = Pt(9.5)

    p_dean = doc.add_paragraph()
    p_dean.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dean.paragraph_format.line_spacing = 1.15
    p_dean.paragraph_format.space_before = Pt(12)
    r_d1 = p_dean.add_run("_________________________________________\nENGR. EMELINA R. PADAYAO, SE\n")
    r_d1.font.name = "Times New Roman"
    r_d1.font.size = Pt(11)
    r_d1.font.bold = True
    r_d2 = p_dean.add_run("College Dean, College of Engineering and Computational Sciences")
    r_d2.font.name = "Times New Roman"
    r_d2.font.size = Pt(10)

    doc.add_page_break()

    # --------------------------------------------------------------------------
    # PAGE 3–4: OFFICIAL CAPSTONE ABSTRACT (VERBATIM FROM WORKING PAPER)
    # --------------------------------------------------------------------------
    append_official_capstone_abstract_content(doc)

    doc.save(output_docx_path)
    print("Saved Capstone Abstract Packet (Title, Approval, Abstract) DOCX:", output_docx_path)


# ==============================================================================
# STEP 5: REQUIREMENT 4b & 4c — PROMOTIONAL FLYER & COMPACT USER BOOKLET (.docx)
# ==============================================================================
def build_flyer_and_booklet_docx(flyer_docx_path, booklet_docx_path, qr_imrad_path, qr_portal_path):
    # --------------------------------------------------------------------------
    # 4b. PROMOTIONAL FLYER (AURORA_System_Flyer.docx)
    # --------------------------------------------------------------------------
    fdoc = docx.Document()
    for s in fdoc.sections:
        s.top_margin = Inches(0.55)
        s.bottom_margin = Inches(0.55)
        s.left_margin = Inches(0.65)
        s.right_margin = Inches(0.65)

    # Banner Header Table
    bt = fdoc.add_table(rows=1, cols=1)
    bt.alignment = WD_TABLE_ALIGNMENT.CENTER
    bc = bt.rows[0].cells[0]
    bc.width = Inches(7.2)
    set_cell_margins(bc, top=120, bottom=120, left=140, right=140)
    set_cell_shading(bc, "800000")
    bp = bc.paragraphs[0]
    bp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_b1 = bp.add_run(f"{OFFICIAL_TITLE_UPPER}\n")
    r_b1.font.name = "Times New Roman"
    r_b1.font.size = Pt(13.5)
    r_b1.font.bold = True
    r_b1.font.color.rgb = RGBColor(255, 255, 255)
    r_b2 = bp.add_run(
        "Department of Computational Sciences • College of Engineering and Computational Sciences • Partido State University"
    )
    r_b2.font.name = "Times New Roman"
    r_b2.font.size = Pt(9.5)
    r_b2.font.italic = True
    r_b2.font.color.rgb = RGBColor(254, 240, 138)

    p_tag = fdoc.add_paragraph()
    p_tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_tag.paragraph_format.space_before = Pt(6)
    p_tag.paragraph_format.space_after = Pt(6)
    rtag = p_tag.add_run(
        "Unifying Research, Capstone, Thesis & Dissertation Defenses Across All 5 Colleges of Partido State University – Goa Campus"
    )
    rtag.font.name = "Times New Roman"
    rtag.font.size = Pt(11)
    rtag.font.bold = True
    rtag.font.italic = True
    rtag.font.color.rgb = RGBColor(15, 23, 42)

    # Embed Student Hub & Review Workspace Mockups side-by-side
    img1 = os.path.join(DIAGRAMS_DIR, "aurora_mockup_student_hub.png")
    img2 = os.path.join(DIAGRAMS_DIR, "aurora_mockup_review_workspace.png")
    if os.path.exists(img1) and os.path.exists(img2):
        mt = fdoc.add_table(rows=1, cols=2)
        mt.alignment = WD_TABLE_ALIGNMENT.CENTER
        for idx, (im_p, cap) in enumerate(
            [
                (img1, "Multi-College Defense Stepper & Proponent Hub"),
                (img2, "Dual-Pane Split-Screen PDF.js & Rubric Workspace"),
            ]
        ):
            mc = mt.rows[0].cells[idx]
            mc.width = Inches(3.55)
            set_cell_margins(mc, top=40, bottom=40, left=40, right=40)
            set_cell_shading(mc, "F8FAFC")
            set_cell_borders(
                mc,
                top={"val": "single", "sz": 4, "color": "CBD5E1"},
                bottom={"val": "single", "sz": 4, "color": "CBD5E1"},
                left={"val": "single", "sz": 4, "color": "CBD5E1"},
                right={"val": "single", "sz": 4, "color": "CBD5E1"},
            )
            mp = mc.paragraphs[0]
            mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            mp.add_run().add_picture(im_p, width=Inches(3.35))
            rc = mp.add_run(f"\n{cap}")
            rc.font.name = "Times New Roman"
            rc.font.size = Pt(8.5)
            rc.font.bold = True
            rc.font.color.rgb = RGBColor(30, 41, 59)

    fdoc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 4 Pillars Feature Grid (2x2 Table)
    ft = fdoc.add_table(rows=2, cols=2)
    ft.alignment = WD_TABLE_ALIGNMENT.CENTER
    pillars = [
        (
            "1. Dual-Pane PDF.js & Coordinate Annotations",
            "Eliminates cognitive split-attention by anchoring normalized bounding-box highlights (x%, y%, w%, h%), severity tags, and revision threads directly onto the PDF viewport.",
        ),
        (
            "2. Multi-College Workflows & Conflict Firewall",
            "Supports customizable 5-stage (BSIT Capstone) and 3-stage (COE, CAH, COS, CBM Thesis) pipelines with automatic room-clash and adviser conflict-of-interest isolation.",
        ),
        (
            "3. Automated Rubric & RA 8792 Digital Signatures",
            "Automates weighted rubric computations with step-up password re-authentication and tamper-evident clearance serials (AURORA-YYYY-NNNNNN).",
        ),
        (
            "4. Self-Healing Maintenance & 3-2-1 DR Vault",
            "Built-in administrative console (/admin/system-health) with 6 live diagnostic probes, one-click self-healing repair, and SHA-256 signed JSON cold backups.",
        ),
    ]
    for idx, (ptit, pdesc) in enumerate(pillars):
        r_i, c_i = divmod(idx, 2)
        cell = ft.rows[r_i].cells[c_i]
        cell.width = Inches(3.55)
        set_cell_margins(cell, top=65, bottom=65, left=85, right=85)
        set_cell_shading(cell, "FFFFFF")
        set_cell_borders(
            cell,
            top={"val": "single", "sz": 6, "color": "E2E8F0"},
            bottom={"val": "single", "sz": 6, "color": "E2E8F0"},
            left={"val": "single", "sz": 18, "color": "800000"},
            right={"val": "single", "sz": 6, "color": "E2E8F0"},
        )
        cp = cell.paragraphs[0]
        cp.paragraph_format.space_after = Pt(2)
        rt = cp.add_run(f"{ptit}\n")
        rt.font.name = "Times New Roman"
        rt.font.size = Pt(9.5)
        rt.font.bold = True
        rt.font.color.rgb = RGBColor(128, 0, 0)
        rd = cp.add_run(pdesc)
        rd.font.name = "Times New Roman"
        rd.font.size = Pt(8.8)
        rd.font.color.rgb = RGBColor(51, 65, 85)

    fdoc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Empirical Impact & QR Footer Bar
    qt = fdoc.add_table(rows=1, cols=3)
    qt.alignment = WD_TABLE_ALIGNMENT.CENTER
    q_widths = [Inches(3.7), Inches(1.75), Inches(1.75)]
    c0 = qt.rows[0].cells[0]
    c0.width = q_widths[0]
    set_cell_margins(c0, top=65, bottom=65, left=85, right=85)
    set_cell_shading(c0, "0F172A")
    p0 = c0.paragraphs[0]
    r0_h = p0.add_run("EMPIRICAL IMPACT & PROJECT TEAM (BSIT 4C)\n")
    r0_h.font.name = "Times New Roman"
    r0_h.font.size = Pt(9.5)
    r0_h.font.bold = True
    r0_h.font.color.rgb = RGBColor(254, 240, 138)
    r0_b = p0.add_run(
        "• SUS Usability Score: 91.8 / 100 (Grade A — Excellent)\n"
        "• UTAUT Acceptability Mean: 4.86 / 5.00 (Highly Acceptable)\n"
        "• Turnaround Reduction: 18.4 days → 2.6 days (−85.9%)\n"
        "• Authors: G. V. D. Mañago, C. A. B. Castillo, R. M. S. Buenafe, L. M. B. Encinas, L. Bares\n"
        "• Adviser: Froiland B. Peñalosa | Chair & Reader: Kennedy C. Cuya, DIT"
    )
    r0_b.font.name = "Times New Roman"
    r0_b.font.size = Pt(8.2)
    r0_b.font.color.rgb = RGBColor(248, 250, 252)

    for idx, (qp, qlbl) in enumerate(
        [
            (qr_portal_path, "Scan for Live Portal\naurora-parsu.vercel.app"),
            (qr_imrad_path, "Scan for IMRAD Paper\n(ACM SIGPLAN PDF)"),
        ]
    ):
        cell = qt.rows[0].cells[idx + 1]
        cell.width = q_widths[idx + 1]
        set_cell_margins(cell, top=35, bottom=35, left=35, right=35)
        set_cell_shading(cell, "F8FAFC")
        set_cell_borders(
            cell,
            top={"val": "single", "sz": 6, "color": "CBD5E1"},
            bottom={"val": "single", "sz": 6, "color": "CBD5E1"},
            left={"val": "single", "sz": 6, "color": "CBD5E1"},
            right={"val": "single", "sz": 6, "color": "CBD5E1"},
        )
        cp = cell.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if os.path.exists(qp):
            cp.add_run().add_picture(qp, width=Inches(1.05))
        rl = cp.add_run(f"\n{qlbl}")
        rl.font.name = "Times New Roman"
        rl.font.size = Pt(8.0)
        rl.font.bold = True
        rl.font.color.rgb = RGBColor(15, 23, 42)

    fdoc.save(flyer_docx_path)
    print("Saved Promotional Flyer DOCX:", flyer_docx_path)

    # --------------------------------------------------------------------------
    # 4c. COMPACT USER BOOKLET (AURORA_System_Booklet.docx)
    # --------------------------------------------------------------------------
    bdoc = docx.Document()
    for s in bdoc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.9)
        s.right_margin = Inches(0.9)

    p_bh = bdoc.add_paragraph()
    p_bh.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rb1 = p_bh.add_run("AURORA QUICK-START SYSTEM BOOKLET\n")
    rb1.font.name = "Times New Roman"
    rb1.font.size = Pt(15)
    rb1.font.bold = True
    rb1.font.color.rgb = RGBColor(128, 0, 0)
    rb2 = p_bh.add_run(
        f"{OFFICIAL_TITLE_MIXED}\n"
        "Proponents (BSIT 4C): Gene Vincent D. Mañago • Carol Ann B. Castillo • Rona Mae S. Buenafe • Lara Mae B. Encinas • Leomer Bares\n"
        "Capstone Adviser & Coordinator: Froiland B. Peñalosa  |  Dept. Chair & Capstone Reader: Kennedy C. Cuya, DIT\n"
        "College Dean: Engr. Emelina R. Padayao, SE  |  Panel Chair: Salvador V. Briones II, MAEd"
    )
    rb2.font.name = "Times New Roman"
    rb2.font.size = Pt(9.5)
    rb2.font.italic = True

    booklet_modules = [
        (
            "Module 1: Student Proponent Quick-Start (Research, Capstone, Thesis & Dissertation)",
            [
                "1. Sign In & Create Docket: Log in at https://aurora-parsu.vercel.app/login, open My Project, click Create Project, and share the 8-character Join Code with your groupmates.",
                "2. Upload PDF Manuscript: Drag and drop your compiled PDF manuscript. AURORA automatically computes its FIPS 180-4 SHA-256 fingerprint and assigns version pointer v1/v2/v3.",
                "3. File Form DCS-CF-03: Complete the Oral Defense Application prerequisite checklist (Turnitin similarity <= 20%) to route your manuscript to your Research Adviser.",
                "4. Resolve Inline Annotations & View Verdicts: Open the Review Workspace to reply to coordinate-pinned comments and download your signed Certificate of Defense (DCS-CF-05).",
            ],
        ),
        (
            "Module 2: Research Adviser Guide (Froiland B. Peñalosa & Faculty Advisers)",
            [
                "1. Advisee Queue: Open Dashboard or Submissions to view all assigned student research, capstone, or thesis groups.",
                "2. Split-Screen PDF.js Annotation: Select text or draw coordinate bounding boxes directly on the manuscript PDF, categorize severity (Critical, Major, Minor), and post remarks.",
                "3. Endorsement Gate (Form DCS-CF-03): Click Approve & Endorse for Defense to digitally certify manuscript readiness and unlock defense scheduling.",
            ],
        ),
        (
            "Module 3: Defense Panel Evaluator Guide (Panel of Examiners)",
            [
                "1. Live Evaluation Workspace: Open your assigned defense from Defenses to launch the 60/40 split-screen PDF and Form DCS-CF-04 Rubric Drawer.",
                "2. Dynamic Weighted Scoring: Input criterion scores across your college's configured rubric criteria (automatically computing weighted scores in real time).",
                "3. RA 8792 Step-Up Digital Signature: Re-enter your account password to legally certify your signature, generating an immutable AURORA-YYYY-NNNNNN serial and SHA-256 hash.",
            ],
        ),
        (
            "Module 4: Research/Capstone Coordinator, College Dean & System Admin Guide",
            [
                "1. Conflict-Free Scheduling (/dashboard/defenses/schedule): Schedule single or batch defenses with automatic room-clash detection and Adviser Conflict-of-Interest isolation.",
                "2. Multi-College Workflows & Rubrics (/admin/stages & /admin/rubrics): Configure 5-stage (BSIT) or 3-stage (COE, CAH, COS, CBM) pipelines and dynamic 100%-weighted rubrics.",
                "3. Executive Analytics & Objective 4 Survey (/dashboard/analytics): Monitor pass rates, turnaround KPIs, and live SUS (91.8/100) & UTAUT (4.86/5.00) acceptability metrics.",
                "4. Maintenance, Troubleshooting & DR Console (/admin/system-health): Run 6 live diagnostic probes, trigger One-Click Self-Healing Maintenance, and export/verify SHA-256 JSON backups.",
            ],
        ),
    ]

    for mtitle, msteps in booklet_modules:
        pm = bdoc.add_paragraph()
        pm.paragraph_format.space_before = Pt(9)
        pm.paragraph_format.space_after = Pt(2.5)
        rm = pm.add_run(mtitle)
        rm.font.name = "Times New Roman"
        rm.font.size = Pt(11.5)
        rm.font.bold = True
        rm.font.color.rgb = RGBColor(128, 0, 0)
        for st in msteps:
            ps = bdoc.add_paragraph()
            ps.paragraph_format.left_indent = Inches(0.25)
            ps.paragraph_format.space_after = Pt(2)
            ps.paragraph_format.line_spacing = 1.15
            rs = ps.add_run(st)
            rs.font.name = "Times New Roman"
            rs.font.size = Pt(9.8)

    bdoc.save(booklet_docx_path)
    print("Saved Compact User Booklet DOCX:", booklet_docx_path)


# ==============================================================================
# STEP 6: REQUIREMENT 4a — COMPLETE OPERATIONAL MANUAL (.docx)
# ==============================================================================
def build_operational_manual_docx(manual_docx_path):
    from generate_all_annexes_docx import flush_table, flush_code_block, format_inline
    import re

    mdoc = docx.Document()
    for s in mdoc.sections:
        s.top_margin = Inches(0.9)
        s.bottom_margin = Inches(0.9)
        s.left_margin = Inches(1.1)
        s.right_margin = Inches(1.0)

    # Cover Header
    p_u = mdoc.add_paragraph()
    p_u.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_u.paragraph_format.line_spacing = 1.2
    p_u.paragraph_format.space_after = Pt(8)
    r1 = p_u.add_run("Republic of the Philippines\nPARTIDO STATE UNIVERSITY\n")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(13)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(128, 0, 0)
    r2 = p_u.add_run(
        "COLLEGE OF ENGINEERING AND COMPUTATIONAL SCIENCES\nDepartment of Computational Sciences | Goa, Camarines Sur"
    )
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(10.5)
    r2.font.bold = True

    p_t = mdoc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.space_before = Pt(10)
    p_t.paragraph_format.space_after = Pt(6)
    rt1 = p_t.add_run("COMPREHENSIVE OPERATIONAL, SYSTEM ADMINISTRATOR,\nMAINTENANCE & DISASTER RECOVERY MANUAL\n")
    rt1.font.name = "Times New Roman"
    rt1.font.size = Pt(14)
    rt1.font.bold = True
    rt1.font.color.rgb = RGBColor(15, 23, 42)
    rt2 = p_t.add_run(f"“{OFFICIAL_TITLE_MIXED}”")
    rt2.font.name = "Times New Roman"
    rt2.font.size = Pt(11.5)
    rt2.font.bold = True
    rt2.font.italic = True
    rt2.font.color.rgb = RGBColor(128, 0, 0)

    meta_t = mdoc.add_table(rows=5, cols=2)
    meta_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_rows = [
        ("Proponents (BSIT 4C)", "Gene Vincent D. Mañago • Carol Ann B. Castillo • Rona Mae S. Buenafe • Lara Mae B. Encinas • Leomer Bares"),
        ("Capstone Adviser & Coord.", "Froiland B. Peñalosa"),
        ("Dept. Chair & Capstone Reader", "Kennedy C. Cuya, DIT"),
        ("Panel of Examiners", "Salvador V. Briones II, MAEd (Chair) • Rowell John B. Artiaga, DIT • Michael B. Amata • Froiland B. Peñalosa • Kennedy C. Cuya, DIT"),
        ("College Dean", "Engr. Emelina R. Padayao, SE (College of Engineering and Computational Sciences)"),
    ]
    w_cols = [Inches(2.1), Inches(4.2)]
    for ri, (k, v) in enumerate(m_rows):
        for ci, txt in enumerate((k, v)):
            c = meta_t.rows[ri].cells[ci]
            c.width = w_cols[ci]
            set_cell_margins(c, top=45, bottom=45, left=75, right=75)
            set_cell_shading(c, "F8FAFC" if ri % 2 == 0 else "FFFFFF")
            set_cell_borders(
                c,
                top={"val": "single", "sz": 4, "color": "CBD5E1"},
                bottom={"val": "single", "sz": 4, "color": "CBD5E1"},
                left={"val": "single", "sz": 4, "color": "CBD5E1"},
                right={"val": "single", "sz": 4, "color": "CBD5E1"},
            )
            cp = c.paragraphs[0]
            cp.paragraph_format.space_after = Pt(0)
            r = cp.add_run(txt)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.2)
            if ci == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(128, 0, 0)

    # Embed visual mockups if present
    mockups = [
        ("aurora_mockup_student_hub.png", "Figure 1. Student Proponent Hub & Multi-Stage Defense Stepper"),
        ("aurora_mockup_review_workspace.png", "Figure 2. Split-Screen PDF.js Coordinate Annotation & Rubric Workspace"),
        ("aurora_mockup_scheduler.png", "Figure 3. Conflict-Free Defense Scheduler & Adviser Firewall"),
        ("aurora_mockup_maintenance_dr.png", "Figure 4. Maintenance, Troubleshooting & 3-2-1 Disaster Recovery Console"),
    ]
    for m_file, m_cap in mockups:
        mp_path = os.path.join(DIAGRAMS_DIR, m_file)
        if os.path.exists(mp_path):
            pi = mdoc.add_paragraph()
            pi.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pi.paragraph_format.space_before = Pt(8)
            pi.paragraph_format.space_after = Pt(2)
            pi.add_run().add_picture(mp_path, width=Inches(5.6))
            pc = mdoc.add_paragraph()
            pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pc.paragraph_format.space_after = Pt(6)
            rc = pc.add_run(m_cap)
            rc.font.name = "Times New Roman"
            rc.font.size = Pt(9)
            rc.font.bold = True
            rc.font.italic = True

    # Parse Annex J markdown into the Operational Manual
    annex_j_path = os.path.join(WORKSPACE, "docs", "annexes", "ANNEX_J_USER_AND_SYSTEM_MANUALS.md")
    if os.path.exists(annex_j_path):
        with open(annex_j_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        in_table = False
        table_rows = []
        skip_top = True
        for line in lines:
            s = line.strip()
            if s.startswith("# ANNEX J"):
                skip_top = False
                continue
            if skip_top or s.startswith("## Project:") or s == "---":
                continue
            if s.startswith("|") and s.endswith("|"):
                if re.match(r"^\|[\s\-:]+(\|[\s\-:]+)+\|$", s):
                    continue
                table_rows.append([c.strip() for c in s[1:-1].split("|")])
                in_table = True
                continue
            else:
                if in_table and table_rows:
                    flush_table(mdoc, table_rows)
                    table_rows = []
                    in_table = False
            if not s:
                continue
            if s.startswith("## "):
                p = mdoc.add_paragraph()
                p.paragraph_format.space_before = Pt(12)
                p.paragraph_format.space_after = Pt(4)
                r = p.add_run(s[3:])
                r.font.name = "Times New Roman"
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = RGBColor(128, 0, 0)
            elif s.startswith("### "):
                p = mdoc.add_paragraph()
                p.paragraph_format.space_before = Pt(8)
                p.paragraph_format.space_after = Pt(3)
                r = p.add_run(s[4:])
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            else:
                p = mdoc.add_paragraph()
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.line_spacing = 1.15
                if s.startswith("- ") or re.match(r"^\d+\.\s", s):
                    p.paragraph_format.left_indent = Inches(0.25)
                format_inline(p, s, default_font="Times New Roman", default_size=10)
        if in_table and table_rows:
            flush_table(mdoc, table_rows)

    mdoc.save(manual_docx_path)
    print("Saved Operational Manual DOCX:", manual_docx_path)


if __name__ == "__main__":
    qr_imrad, qr_card, qr_portal = generate_qr_codes_and_flyer_visual()

    imrad_docx = os.path.join(WORKSPACE, "AURORA_IMRAD_ACM_SIGPLAN.docx")
    boa_docx = os.path.join(WORKSPACE, "AURORA_Book_of_Abstract_eCopy.docx")
    cap_abs_docx = os.path.join(WORKSPACE, "AURORA_Capstone_Abstract_Packet.docx")
    manual_docx = os.path.join(WORKSPACE, "AURORA_Operational_Manual.docx")
    flyer_docx = os.path.join(WORKSPACE, "AURORA_System_Flyer.docx")
    booklet_docx = os.path.join(WORKSPACE, "AURORA_System_Booklet.docx")

    build_imrad_acm_sigplan_docx(imrad_docx)
    build_book_of_abstract_ecopy_docx(boa_docx, qr_card)
    build_capstone_abstract_packet_docx(cap_abs_docx)
    build_operational_manual_docx(manual_docx)
    build_flyer_and_booklet_docx(flyer_docx, booklet_docx, qr_imrad, qr_portal)
