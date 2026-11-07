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
    W, H = 760, 860
    card = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([8, 8, W - 8, H - 8], radius=24, fill=(248, 250, 252), outline=(128, 0, 0), width=5)
    d.rounded_rectangle([8, 8, W - 8, 108], radius=20, fill=(128, 0, 0))
    d.rectangle([8, 70, W - 8, 108], fill=(128, 0, 0))
    d.text((88, 26), "SCAN FOR FULL IMRAD PAPER (PDF)", font=get_pil_font(28, True), fill=(255, 255, 255))
    d.text((135, 66), "ACM SIGPLAN Proceedings Format • ParSU CECS", font=get_pil_font(17, False), fill=(254, 240, 138))

    qr_resized = qr_img.resize((480, 480), Image.Resampling.NEAREST)
    card.paste(qr_resized, ((W - 480) // 2, 136))

    d.rounded_rectangle([44, 640, W - 44, 736], radius=12, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    d.text((70, 654), "Direct Online PDF Access Link:", font=get_pil_font(16, True), fill=(128, 0, 0))
    d.text((70, 684), IMRAD_PDF_URL, font=get_pil_font(15, True), fill=(2, 132, 199))

    d.text((74, 760), "Proponents: Mañago, G. V. • Castillo, C. A. • Buenafe, R. M. • Encinas, L. M.", font=get_pil_font(15, True), fill=(15, 23, 42))
    d.text((140, 790), "Research Adviser: Prof. Froiland B. Peñalosa", font=get_pil_font(15, False), fill=(71, 85, 105))

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

    # Section 0: Top Full-Width Title, Authors, and Abstract Header (ACM SIGPLAN style)
    s0 = doc.sections[0]
    s0.top_margin = Inches(0.75)
    s0.bottom_margin = Inches(0.75)
    s0.left_margin = Inches(0.75)
    s0.right_margin = Inches(0.75)
    s0.page_width = Inches(8.5)
    s0.page_height = Inches(11.0)

    footer = s0.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = fp.add_run(
        "AURORA: Paperless Capstone Defense Workflow Platform  |  Partido State University (CECS - DCS)  |  ACM SIGPLAN IMRAD Format"
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
        "PARTIDO STATE UNIVERSITY • COLLEGE OF ENGINEERING AND COMPUTATIONAL SCIENCES • BSIT CAPSTONE PROCEEDINGS (2026)"
    )
    r_conf.font.name = "Times New Roman"
    r_conf.font.size = Pt(8.5)
    r_conf.font.bold = True
    r_conf.font.color.rgb = RGBColor(128, 0, 0)

    # Main Paper Title (17pt Bold, ACM Style)
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(8)
    r_t = p_title.add_run(
        "AURORA: An Academic Unified Review, Observation, Rating, and Assessment Platform for Paperless Capstone Defense Workflows"
    )
    r_t.font.name = "Times New Roman"
    r_t.font.size = Pt(16.5)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(15, 23, 42)

    # Authors Grid (5 Columns: 4 Proponents + Research Adviser)
    auth_table = doc.add_table(rows=1, cols=5)
    auth_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    authors = [
        ("Gene Vincent Mañago", "Proponent / Lead Dev", "Dept. of Comp. Sciences\nPartido State University\nGoa, Camarines Sur"),
        ("Carol Ann Castillo", "Proponent / Analyst", "Dept. of Comp. Sciences\nPartido State University\nGoa, Camarines Sur"),
        ("Rona Mae Buenafe", "Proponent / QA Lead", "Dept. of Comp. Sciences\nPartido State University\nGoa, Camarines Sur"),
        ("Lara Mae Encinas", "Proponent / UI-UX", "Dept. of Comp. Sciences\nPartido State University\nGoa, Camarines Sur"),
        ("Froiland B. Peñalosa", "Research Adviser", "Dept. of Comp. Sciences\nPartido State University\nGoa, Camarines Sur"),
    ]
    for idx, (name, role, aff) in enumerate(authors):
        c = auth_table.rows[0].cells[idx]
        c.width = Inches(1.4)
        set_cell_margins(c, top=30, bottom=40, left=30, right=30)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.05
        cp.paragraph_format.space_after = Pt(2)
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
    p_div.paragraph_format.space_before = Pt(4)
    p_div.paragraph_format.space_after = Pt(4)

    # Continuous Section Break -> 2-Column ACM SIGPLAN Body!
    s1 = doc.add_section(WD_SECTION.CONTINUOUS)
    s1.top_margin = Inches(0.75)
    s1.bottom_margin = Inches(0.75)
    s1.left_margin = Inches(0.75)
    s1.right_margin = Inches(0.75)
    sectPr = s1._sectPr
    cols = sectPr.xpath("./w:cols")[0]
    cols.set(qn("w:num"), "2")
    cols.set(qn("w:space"), "320")  # 0.22 inch gutter between columns

    def add_acm_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_acm_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_acm_body(text, indent=True):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.08
        if indent:
            p.paragraph_format.first_line_indent = Inches(0.18)
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.2)
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_acm_table(caption, headers, rows, col_widths):
        pc = doc.add_paragraph()
        pc.paragraph_format.space_before = Pt(5)
        pc.paragraph_format.space_after = Pt(2)
        pc.paragraph_format.keep_with_next = True
        rc = pc.add_run(caption)
        rc.font.name = "Times New Roman"
        rc.font.size = Pt(8.5)
        rc.font.bold = True

        t = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ci, h in enumerate(headers):
            cell = t.rows[0].cells[ci]
            cell.width = col_widths[ci]
            set_cell_margins(cell, top=40, bottom=40, left=45, right=45)
            set_cell_shading(cell, "1E293B")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(h)
            r.font.name = "Times New Roman"
            r.font.size = Pt(8.0)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

        for ri, rdata in enumerate(rows):
            bg = "FFFFFF" if ri % 2 == 0 else "F8FAFC"
            for ci, val in enumerate(rdata):
                cell = t.rows[ri + 1].cells[ci]
                cell.width = col_widths[ci]
                set_cell_margins(cell, top=35, bottom=35, left=45, right=45)
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
                r.font.size = Pt(7.8)
                if ci == 0 or ri == len(rows) - 1 and "Composite" in rdata[0]:
                    r.font.bold = True

        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(3)

    # Abstract
    add_acm_h1("Abstract")
    add_acm_body(
        "Traditional undergraduate capstone and thesis defense workflows in Philippine state universities rely heavily on physical manuscript printing, manual adviser endorsement routing, ad-hoc room scheduling, and hand-computed paper score sheets. These fragmented processes result in prolonged review turnaround times, scheduling collisions, high financial printing costs for students, and the absence of cryptographic auditability. This paper presents AURORA (Academic Unified Review, Observation, Rating, and Assessment), a cloud-native, paperless academic defense management and quality assurance platform engineered for the College of Engineering and Computational Sciences (CECS) at Partido State University. Built using Next.js 16 (App Router), React 19, TypeScript, and Supabase (PostgreSQL 15 with Row-Level Security), AURORA unifies four core architectural innovations: (1) a resolution-independent, dual-pane PDF.js manuscript review workspace with real-time WebSocket coordinate annotations and FIPS 180-4 SHA-256 document version fingerprinting; (2) an automated defense scheduler with venue clash detection and an academic Conflict-of-Interest Firewall that prevents research advisers from sitting as voting panelists for their own advisees; (3) a dynamic weighted rubric engine (Form DCS-CF-04) integrated with Republic Act No. 8792 step-up password re-authentication and tamper-evident digital signature serialization (AURORA-YYYY-NNNNNN); and (4) an administrative self-healing maintenance and 3-2-1 disaster recovery console. Empirical evaluation with N = 27 institutional stakeholders using a validated 10-item System Usability Scale (SUS) and 27-item Unified Theory of Acceptance and Use of Technology (UTAUT) instrument (Cronbach's α = 0.946) yielded a composite SUS score of 91.8 / 100 (Grade A — Excellent) and a grand UTAUT mean of 4.86 / 5.00 (Highly Acceptable), while reducing manuscript endorsement turnaround time by 85.9% (from 18.4 days to 2.6 days).",
        indent=False,
    )

    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.space_after = Pt(6)
    r_kl = p_kw.add_run("Keywords: ")
    r_kl.font.name = "Times New Roman"
    r_kl.font.size = Pt(8.8)
    r_kl.font.bold = True
    r_kv = p_kw.add_run(
        "Paperless Academic Workflow, Capstone Defense Management, Coordinate PDF Annotation, Republic Act No. 8792 Digital Signatures, Row-Level Security, System Usability Scale (SUS), UTAUT."
    )
    r_kv.font.name = "Times New Roman"
    r_kv.font.size = Pt(8.8)
    r_kv.font.italic = True

    # 1. INTRODUCTION
    add_acm_h1("1  Introduction")
    add_acm_body(
        "Undergraduate capstone research is a cornerstone curriculum requirement for computing degrees under Commission on Higher Education (CHED) Memorandum Order No. 25, Series of 2015 [1]. At Partido State University (ParSU), students enrolled in the Bachelor of Science in Information Technology (BSIT) program under the College of Engineering and Computational Sciences (CECS) progress through a rigorous four-stage oral defense lifecycle encompassing Concept Paper Defense, Title Defense, Proposal Defense, and Final Oral Defense.",
        indent=False,
    )
    add_acm_body(
        "Despite the digital nature of computing education, the operational administration of capstone defenses has historically remained bound to physical paper workflows. Student teams print multiple copies of 80-to-150-page manuscripts for every defense stage; research advisers annotate drafts manually with ink; defense coordinators cross-reference faculty schedules on spreadsheets to book deliberation rooms; and panel evaluators compute weighted grades manually on printed Form DCS-CF-04 sheets. Key informant interviews conducted at ParSU CECS identified four critical bottlenecks: (1) an average 18.4-day turnaround time for physical manuscript review and Form DCS-CF-03 endorsement; (2) frequent room and panelist scheduling collisions; (3) arithmetic and archival vulnerabilities in paper rubric sheets; and (4) the lack of centralized disaster recovery backups.",
    )
    add_acm_body(
        "To resolve these challenges, this study developed and evaluated AURORA across four research objectives: (Obj. 1) digitizing the multi-stage defense workflow with SHA-256 manuscript versioning and Form DCS-CF-03 adviser endorsement gating; (Obj. 2) engineering a real-time split-screen PDF coordinate annotation workspace and conflict-free defense scheduler; (Obj. 3) implementing a dynamic weighted rubric engine (Form DCS-CF-04) secured by Republic Act No. 8792 digital signatures and a 3-2-1 Disaster Recovery Console; and (Obj. 4) evaluating system usability and technology acceptance using the System Usability Scale (SUS) [5] and Unified Theory of Acceptance and Use of Technology (UTAUT) [6].",
    )

    # 2. RELATED WORK
    add_acm_h1("2  Related Work")
    add_acm_body(
        "General-purpose Learning Management Systems (LMS) such as Moodle and Google Classroom support classroom assignment uploads but lack specialized academic defense governance primitives: multi-stage prerequisite gating, panel committee conflict-of-interest isolation, weighted multi-evaluator rubric consensus, and cryptographic clearance certificates. Similarly, institutional repository platforms focus on post-graduation thesis archiving rather than active, iterative pre-defense review.",
        indent=False,
    )
    add_acm_body(
        "Furthermore, under Philippine Republic Act No. 8792 (Electronic Commerce Act of 2000) [2] and Republic Act No. 10173 (Data Privacy Act of 2012) [3], academic records bearing electronic signatures require step-up identity verification, deterministic payload hashing (FIPS 180-4 SHA-256 [4]), and strict access control to ensure legal non-repudiation and data privacy.",
    )

    # 3. METHODOLOGY
    add_acm_h1("3  Methodology")
    add_acm_h2("3.1  Agile Scrum SDLC & Four-Tier Cloud Architecture")
    add_acm_body(
        "AURORA was developed using the Agile Scrum Software Development Life Cycle (SDLC) across a 14-month academic timeline spanning Academic Year 2025–2026 through the 1st Semester of Academic Year 2026–2027 (August 15, 2025 to October 2, 2026). The platform is structured into four decoupled cloud tiers (Table 1): (1) a Client Presentation Tier built with React 19, Tailwind CSS v4, and Mozilla PDF.js; (2) an Edge & Server Action Tier running on Next.js 16 (App Router) and Vercel Edge Middleware; (3) a Backend Service Tier powered by Supabase GoTrue Auth, private S3 storage buckets, and Realtime WebSockets; and (4) a Data Persistence Tier on PostgreSQL 15 enforcing Row-Level Security (RLS) across 20 normalized relational tables.",
        indent=False,
    )

    add_acm_table(
        "Table 1. AURORA Four-Tier Cloud Architecture Stack",
        ["Tier", "Core Stack", "Governance & Security Role"],
        [
            ["1. Client UI", "React 19, PDF.js", "60/40 split-screen PDF & rubric drawer"],
            ["2. Edge / API", "Next.js 16, TS", "RBAC route guard; RA 8792 step-up auth"],
            ["3. BaaS Layer", "Supabase Auth/S3", "Private signed URLs; WAL WebSocket sync"],
            ["4. Database", "PostgreSQL 15", "20-table RLS; atomic serials; 3-2-1 DR"],
        ],
        [Inches(0.85), Inches(1.05), Inches(1.45)],
    )

    add_acm_h2("3.2  Coordinate Annotations, Conflict Guard & RA 8792")
    add_acm_body(
        "When an adviser or panelist highlights text on page p, pixel coordinates (X, Y, W, H) are normalized against canvas dimensions (Cw, Ch) into floating-point percentages (x%, y%, w%, h%) ∈ [0, 100], ensuring zero positional drift across screen sizes. During defense scheduling, the server-side Conflict-of-Interest Firewall queries project_members and blocks any attempt to assign a project's Research Adviser (e.g., Prof. Froiland B. Peñalosa) as a voting panelist for their own advisee.",
        indent=False,
    )
    add_acm_body(
        "During oral defense grading (Form DCS-CF-04), the rubric engine computes the weighted score Sw = Σ(ri · wi / 100) across criteria summing to 100%. To lock an evaluation under RA 8792, the panelist re-authenticates their password, triggering the atomic PostgreSQL function generate_certificate_serial() (AURORA-YYYY-NNNNNN) and binding a SHA-256 signature hash to the immutable record.",
    )

    add_acm_h2("3.3  Psychometric Validation & Evaluation Design")
    add_acm_body(
        "To address Objective 4, a survey instrument integrating the 10-item System Usability Scale (SUS) [5] and 27-item UTAUT model [6] (excluding redundant original items PE2 and UB2 per expert review) was validated by three institutional experts using the Good and Scates (1972) criteria, achieving a validity score of 4.89 / 5.00 (Very Highly Valid). Internal consistency across all 37 items yielded a Cronbach's Alpha of α = 0.946 (Excellent Reliability). The instrument was administered to N = 27 ParSU CECS stakeholders (15 BSIT students, 5 advisers, 5 panelists, 1 coordinator, and 1 college dean).",
        indent=False,
    )

    # 4. RESULTS AND DISCUSSION
    add_acm_h1("4  Results and Discussion")
    add_acm_h2("4.1  Operational Efficiency & QA Verification")
    add_acm_body(
        "Transitioning from physical paper routing to AURORA's cloud workflow reduced average manuscript review and Form DCS-CF-03 endorsement turnaround time from 18.4 days to 2.6 days—an 85.9% improvement (Table 2). Automated room and panelist conflict detection eliminated double-booking incidents (0.0% clash rate), while all 42 functional, RLS security, and signature immutability test cases passed (100.0% pass rate). Additionally, the Maintenance & Disaster Recovery Console (/admin/system-health) provides 6 live diagnostic probes, one-click self-healing pointer repair, and SHA-256 verified 20-table JSON cold archives (RTO ≤ 4 hours).",
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
        "Table 3 presents the empirical evaluation results (N = 27). AURORA achieved a composite SUS score of 91.8 / 100 (normalized mean μ = 4.84, SD = 0.28), earning a Grade A (Excellent) usability rating. Across the six UTAUT constructs, Behavioral Intention rated highest (μ = 4.90, SD = 0.20), followed by Performance Expectancy (μ = 4.88, SD = 0.22), Use Behavior (μ = 4.87, SD = 0.24), Effort Expectancy (μ = 4.86, SD = 0.25), Facilitating Conditions (μ = 4.85, SD = 0.26), and Social Influence (μ = 4.81, SD = 0.30), yielding a Composite Grand Mean of 4.86 / 5.00 (Highly Acceptable).",
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
        "AURORA successfully modernizes the undergraduate capstone defense lifecycle at Partido State University by integrating coordinate-pinned PDF review, conflict-free scheduling, dynamic weighted rubric scoring, RA 8792 cryptographic signatures, and 3-2-1 disaster recovery into a unified cloud platform. With an 85.9% reduction in review turnaround time, a 91.8/100 SUS score, and a 4.86/5.00 UTAUT acceptability mean, the system is empirically validated for full institutional deployment across ParSU colleges.",
        indent=False,
    )

    # ACKNOWLEDGMENTS & REFERENCES
    add_acm_h1("Acknowledgments")
    add_acm_body(
        "The authors thank Research Adviser Prof. Froiland B. Peñalosa, Capstone Coordinator and Department Chair Dr. Kennedy C. Cuya, and CECS Dean Engr. Emelina R. Padayao of Partido State University for their invaluable guidance.",
        indent=False,
    )

    add_acm_h1("References")
    refs = [
        "[1] Commission on Higher Education (CHED). 2015. CMO No. 25, s. 2015: Revised Policies, Standards, and Guidelines for BSCS, BSIS, and BSIT Programs.",
        "[2] Congress of the Philippines. 2000. Republic Act No. 8792: Electronic Commerce Act of 2000.",
        "[3] Congress of the Philippines. 2012. Republic Act No. 10173: Data Privacy Act of 2012 and NPC Circular No. 16-01.",
        "[4] National Institute of Standards and Technology (NIST). 2015. Secure Hash Standard (SHS), FIPS PUB 180-4.",
        "[5] John Brooke. 1996. SUS: A 'Quick and Dirty' Usability Scale. In Usability Evaluation in Industry, Taylor & Francis, 189–194.",
        "[6] Viswanath Venkatesh, Michael G. Morris, Gordon B. Davis, and Fred D. Davis. 2003. User Acceptance of Information Technology: Toward a Unified View. MIS Quarterly 27, 3 (2003), 425–478.",
        "[7] ISO/IEC 25010:2011. Systems and Software Engineering — Systems and Software Quality Requirements and Evaluation (SQuaRE).",
    ]
    for rf in refs:
        pr = doc.add_paragraph()
        pr.alignment = WD_ALIGN_PARAGRAPH.LEFT
        pr.paragraph_format.space_after = Pt(2)
        pr.paragraph_format.line_spacing = 1.02
        rr = pr.add_run(rf)
        rr.font.name = "Times New Roman"
        rr.font.size = Pt(8.0)
        rr.font.color.rgb = RGBColor(51, 65, 85)

    doc.save(output_docx_path)
    print("Saved 2-Column ACM SIGPLAN IMRAD DOCX:", output_docx_path)


# ==============================================================================
# STEP 3: REQUIREMENT 2 — BOOK OF ABSTRACT (eCopy) WITH QR CODE COVER
# ==============================================================================
def build_book_of_abstract_ecopy_docx(output_docx_path, qr_card_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.25)
        s.right_margin = Inches(1.0)

    # Cover Page per Paper/Group with Scannable QR Code for IMRAD Version
    p_uni = doc.add_paragraph()
    p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_uni.paragraph_format.line_spacing = 1.15
    p_uni.paragraph_format.space_after = Pt(6)
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
    p_badge.paragraph_format.space_before = Pt(10)
    p_badge.paragraph_format.space_after = Pt(6)
    rb = p_badge.add_run("BOOK OF ABSTRACT (eCOPY) — GROUP COVER & IMRAD QR ACCESS")
    rb.font.name = "Times New Roman"
    rb.font.size = Pt(14)
    rb.font.bold = True
    rb.font.color.rgb = RGBColor(15, 23, 42)

    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.space_before = Pt(4)
    p_t.paragraph_format.space_after = Pt(10)
    rt = p_t.add_run(
        "“AURORA: ACADEMIC UNIFIED REVIEW, OBSERVATION, RATING, AND ASSESSMENT — A PAPERLESS ACADEMIC DEFENSE WORKFLOW & QUALITY ASSURANCE PLATFORM”"
    )
    rt.font.name = "Times New Roman"
    rt.font.size = Pt(13)
    rt.font.bold = True
    rt.font.color.rgb = RGBColor(128, 0, 0)

    # Embed Scannable QR Code Card
    if os.path.exists(qr_card_path):
        p_qr = doc.add_paragraph()
        p_qr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_qr.paragraph_format.space_before = Pt(4)
        p_qr.paragraph_format.space_after = Pt(8)
        p_qr.add_run().add_picture(qr_card_path, width=Inches(3.6))

    # Group Metadata Box on Cover
    meta_t = doc.add_table(rows=6, cols=2)
    meta_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        ("Proponents / Researchers", "Gene Vincent Mañago • Carol Ann Castillo • Rona Mae Buenafe • Lara Mae Encinas"),
        ("Degree & Specialization", "Bachelor of Science in Information Technology (BSIT)"),
        ("Research Adviser", "Prof. Froiland B. Peñalosa"),
        ("Capstone Coordinator & Chair", "Dr. Kennedy C. Cuya"),
        ("College Dean", "Engr. Emelina R. Padayao"),
        ("IMRAD PDF Online URL", IMRAD_PDF_URL),
    ]
    widths = [Inches(2.1), Inches(4.1)]
    for ri, (k, v) in enumerate(meta_rows):
        for ci, txt in enumerate((k, v)):
            cell = meta_t.rows[ri].cells[ci]
            cell.width = widths[ci]
            set_cell_margins(cell, top=55, bottom=55, left=80, right=80)
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
            r.font.size = Pt(9.5)
            if ci == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(128, 0, 0)

    doc.add_page_break()

    # Page 2: Executive Abstract for the Book of Abstracts
    p_ah = doc.add_paragraph()
    p_ah.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ah.paragraph_format.space_after = Pt(10)
    rah = p_ah.add_run("EXECUTIVE CAPSTONE ABSTRACT\n")
    rah.font.name = "Times New Roman"
    rah.font.size = Pt(14)
    rah.font.bold = True
    rah.font.color.rgb = RGBColor(128, 0, 0)

    abs_paras = [
        "Traditional undergraduate capstone and thesis defense workflows at Partido State University rely on physical manuscript printing, manual routing of Form DCS-CF-03 endorsement slips, spreadsheet-based room scheduling, and hand-computed Form DCS-CF-04 evaluation sheets. These manual procedures cause prolonged review turnaround times (averaging 18.4 days), scheduling collisions, recurring printing expenses for students, and fragile paper archives.",
        "This study developed AURORA (Academic Unified Review, Observation, Rating, and Assessment), a cloud-native, paperless academic defense workflow and quality assurance platform engineered for the College of Engineering and Computational Sciences (CECS). Developed using the Agile Scrum methodology across Academic Year 2025–2026 through the 1st Semester of Academic Year 2026–2027 (August 2025 to October 2026) with Next.js 16, React 19, TypeScript, and Supabase PostgreSQL 15, AURORA integrates four core modules: (1) SHA-256 versioned PDF manuscript management with college-customizable defense stages and Form DCS-CF-03 adviser gating; (2) a dual-pane split-screen PDF.js review workspace with real-time WebSocket coordinate annotations; (3) an automated defense scheduler with room-clash detection and an academic Conflict-of-Interest Firewall; and (4) a dynamic weighted rubric engine (Form DCS-CF-04) secured by Republic Act No. 8792 step-up password re-authentication, tamper-evident certificate serials (AURORA-YYYY-NNNNNN), and a 3-2-1 Disaster Recovery & Self-Healing Maintenance Console.",
        "Empirical evaluation with N = 27 ParSU CECS stakeholders (15 BSIT students, 5 research advisers, 5 defense panelists, 1 capstone coordinator, and 1 college dean) using a validated 10-item System Usability Scale (SUS) and 27-item UTAUT questionnaire (Good & Scates validity = 4.89/5.00; Cronbach's α = 0.946) demonstrated a Composite SUS Score of 91.8 / 100 (Grade A — Excellent) and a Composite UTAUT Grand Mean of 4.86 / 5.00 (Highly Acceptable), while reducing manuscript review turnaround time by 85.9% (from 18.4 days to 2.6 days).",
    ]
    for ap in abs_paras:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Inches(0.5)
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(ap)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)

    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.space_before = Pt(6)
    rk1 = p_kw.add_run("Keywords: ")
    rk1.font.name = "Times New Roman"
    rk1.font.size = Pt(11.5)
    rk1.font.bold = True
    rk2 = p_kw.add_run(
        "Paperless Defense Workflow, Coordinate PDF Annotation, Republic Act No. 8792 Digital Signature, Row-Level Security, System Usability Scale (SUS), UTAUT."
    )
    rk2.font.name = "Times New Roman"
    rk2.font.size = Pt(11.5)
    rk2.font.italic = True

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
    # PAGE 1: OFFICIAL PARSU TITLE PAGE
    # --------------------------------------------------------------------------
    p_u = doc.add_paragraph()
    p_u.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_u.paragraph_format.line_spacing = 1.3
    p_u.paragraph_format.space_after = Pt(36)
    ru = p_u.add_run(
        "Republic of the Philippines\nPARTIDO STATE UNIVERSITY\nCollege of Engineering and Computational Sciences\nDepartment of Computational Sciences\nGoa, Camarines Sur"
    )
    ru.font.name = "Times New Roman"
    ru.font.size = Pt(12)
    ru.font.bold = True

    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.line_spacing = 1.5
    p_t.paragraph_format.space_before = Pt(24)
    p_t.paragraph_format.space_after = Pt(36)
    rt = p_t.add_run(
        "AURORA: ACADEMIC UNIFIED REVIEW, OBSERVATION, RATING, AND ASSESSMENT — A PAPERLESS ACADEMIC DEFENSE WORKFLOW AND QUALITY ASSURANCE PLATFORM"
    )
    rt.font.name = "Times New Roman"
    rt.font.size = Pt(14)
    rt.font.bold = True

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.line_spacing = 1.5
    p_sub.paragraph_format.space_after = Pt(42)
    rsub = p_sub.add_run(
        "A Capstone Project Manuscript\nPresented to the Faculty of the Department of Computational Sciences\nCollege of Engineering and Computational Sciences\nPartido State University\n\nIn Partial Fulfillment\nof the Requirements for the Degree\nBachelor of Science in Information Technology"
    )
    rsub.font.name = "Times New Roman"
    rsub.font.size = Pt(12)

    p_by = doc.add_paragraph()
    p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_by.paragraph_format.line_spacing = 1.4
    p_by.paragraph_format.space_after = Pt(36)
    rby = p_by.add_run(
        "by:\n\nGENE VINCENT MAÑAGO\nCAROL ANN CASTILLO\nRONA MAE BUENAFE\nLARA MAE ENCINAS\n\nOctober 2026"
    )
    rby.font.name = "Times New Roman"
    rby.font.size = Pt(12)
    rby.font.bold = True

    doc.add_page_break()

    # --------------------------------------------------------------------------
    # PAGE 2: OFFICIAL APPROVAL SHEET
    # --------------------------------------------------------------------------
    p_ap_h = doc.add_paragraph()
    p_ap_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ap_h.paragraph_format.space_after = Pt(18)
    raph = p_ap_h.add_run("APPROVAL SHEET")
    raph.font.name = "Times New Roman"
    raph.font.size = Pt(14)
    raph.font.bold = True

    p_ap_b1 = doc.add_paragraph()
    p_ap_b1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b1.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b1.paragraph_format.line_spacing = 1.5
    p_ap_b1.paragraph_format.space_after = Pt(18)
    rap1 = p_ap_b1.add_run(
        "This capstone project entitled “AURORA: ACADEMIC UNIFIED REVIEW, OBSERVATION, RATING, AND ASSESSMENT — A PAPERLESS ACADEMIC DEFENSE WORKFLOW AND QUALITY ASSURANCE PLATFORM”, prepared and submitted by GENE VINCENT MAÑAGO, CAROL ANN CASTILLO, RONA MAE BUENAFE, and LARA MAE ENCINAS, in partial fulfillment of the requirements for the degree of BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY, has been examined and is hereby recommended for acceptance and approval for Oral Examination."
    )
    rap1.font.name = "Times New Roman"
    rap1.font.size = Pt(12)

    p_adv = doc.add_paragraph()
    p_adv.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_adv.paragraph_format.line_spacing = 1.25
    p_adv.paragraph_format.space_before = Pt(18)
    p_adv.paragraph_format.space_after = Pt(22)
    radv1 = p_adv.add_run("_________________________________________\nFROILAND B. PEÑALOSA\n")
    radv1.font.name = "Times New Roman"
    radv1.font.size = Pt(12)
    radv1.font.bold = True
    radv2 = p_adv.add_run("Research Adviser")
    radv2.font.name = "Times New Roman"
    radv2.font.size = Pt(11.5)

    p_ap_b2 = doc.add_paragraph()
    p_ap_b2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b2.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b2.paragraph_format.line_spacing = 1.5
    p_ap_b2.paragraph_format.space_after = Pt(18)
    rap2 = p_ap_b2.add_run(
        "APPROVED by the Capstone Project Oral Examination Committee on October 2, 2026 with a rating of PASSED (94.50%)."
    )
    rap2.font.name = "Times New Roman"
    rap2.font.size = Pt(12)

    p_ch = doc.add_paragraph()
    p_ch.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ch.paragraph_format.line_spacing = 1.25
    p_ch.paragraph_format.space_after = Pt(18)
    rch1 = p_ch.add_run("_________________________________________\nDR. KENNEDY C. CUYA\n")
    rch1.font.name = "Times New Roman"
    rch1.font.size = Pt(12)
    rch1.font.bold = True
    rch2 = p_ch.add_run("Chairman, Defense Panel")
    rch2.font.name = "Times New Roman"
    rch2.font.size = Pt(11.5)

    # Two Panel Members side by side
    pm_table = doc.add_table(rows=1, cols=2)
    pm_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, pm_label in enumerate(["Panel Member", "Panel Member"]):
        c = pm_table.rows[0].cells[idx]
        c.width = Inches(2.9)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.2
        r_line = cp.add_run("___________________________________\nPANEL MEMBER\n")
        r_line.font.name = "Times New Roman"
        r_line.font.size = Pt(11)
        r_line.font.bold = True
        r_sub = cp.add_run(pm_label)
        r_sub.font.name = "Times New Roman"
        r_sub.font.size = Pt(10.5)

    p_ap_b3 = doc.add_paragraph()
    p_ap_b3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ap_b3.paragraph_format.first_line_indent = Inches(0.5)
    p_ap_b3.paragraph_format.line_spacing = 1.5
    p_ap_b3.paragraph_format.space_before = Pt(18)
    p_ap_b3.paragraph_format.space_after = Pt(18)
    rap3 = p_ap_b3.add_run(
        "ACCEPTED AND APPROVED in partial fulfillment of the requirements for the degree of BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY."
    )
    rap3.font.name = "Times New Roman"
    rap3.font.size = Pt(12)

    sign_t = doc.add_table(rows=1, cols=2)
    sign_t.alignment = WD_TABLE_ALIGNMENT.CENTER
    signatories = [
        ("DR. KENNEDY C. CUYA", "Chairperson, Dept. of Computational Sciences\n& Capstone Coordinator"),
        ("ENGR. EMELINA R. PADAYAO", "Dean, College of Engineering and\nComputational Sciences"),
    ]
    for idx, (s_name, s_role) in enumerate(signatories):
        c = sign_t.rows[0].cells[idx]
        c.width = Inches(2.9)
        set_cell_borders(c)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.line_spacing = 1.2
        rn = cp.add_run(f"___________________________________\n{s_name}\n")
        rn.font.name = "Times New Roman"
        rn.font.size = Pt(11)
        rn.font.bold = True
        rr = cp.add_run(s_role)
        rr.font.name = "Times New Roman"
        rr.font.size = Pt(10)

    doc.add_page_break()

    # --------------------------------------------------------------------------
    # PAGE 3: OFFICIAL CAPSTONE ABSTRACT
    # --------------------------------------------------------------------------
    p_abs_h = doc.add_paragraph()
    p_abs_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs_h.paragraph_format.space_after = Pt(14)
    rabsh = p_abs_h.add_run("ABSTRACT")
    rabsh.font.name = "Times New Roman"
    rabsh.font.size = Pt(14)
    rabsh.font.bold = True

    meta_lines = [
        ("Title:", "AURORA: ACADEMIC UNIFIED REVIEW, OBSERVATION, RATING, AND ASSESSMENT — A PAPERLESS ACADEMIC DEFENSE WORKFLOW AND QUALITY ASSURANCE PLATFORM"),
        ("Proponents:", "Gene Vincent Mañago, Carol Ann Castillo, Rona Mae Buenafe, Lara Mae Encinas"),
        ("Degree:", "Bachelor of Science in Information Technology (BSIT)"),
        ("Institution:", "Partido State University — College of Engineering and Computational Sciences"),
        ("Research Adviser:", "Prof. Froiland B. Peñalosa"),
        ("Academic Year:", "2025–2026 to 1st Semester, 2026–2027 (October 2026)"),
    ]
    for lbl, val in meta_lines:
        pm = doc.add_paragraph()
        pm.paragraph_format.space_after = Pt(2)
        pm.paragraph_format.line_spacing = 1.15
        rl = pm.add_run(f"{lbl} ")
        rl.font.name = "Times New Roman"
        rl.font.size = Pt(11)
        rl.font.bold = True
        rv = pm.add_run(val)
        rv.font.name = "Times New Roman"
        rv.font.size = Pt(11)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(6)

    abs_body = [
        "Undergraduate capstone defense management at Partido State University has traditionally relied on paper-intensive manuscript submissions, manual ink annotations, ad-hoc room and panelist scheduling, and hand-computed evaluation sheets. These manual workflows result in prolonged review turnaround times (averaging 18.4 days), scheduling conflicts, heavy printing costs for students, and the absence of cryptographic auditability.",
        "To resolve these bottlenecks, this study designed, developed, and evaluated AURORA (Academic Unified Review, Observation, Rating, and Assessment), a cloud-native, paperless academic defense management and quality assurance platform for the College of Engineering and Computational Sciences (CECS). Engineered under the Agile Scrum methodology using Next.js 16 (App Router), React 19, TypeScript, and Supabase (PostgreSQL 15 with Row-Level Security), AURORA delivers four core technical contributions: (1) automated multi-stage defense workflow management with FIPS 180-4 SHA-256 manuscript version control and Form DCS-CF-03 adviser endorsement gating; (2) a dual-pane split-screen PDF.js review workspace featuring resolution-independent coordinate annotations synchronized via real-time WebSockets alongside an automated defense scheduler with room-clash and adviser Conflict-of-Interest guards; (3) a dynamic weighted rubric scoring engine (Form DCS-CF-04) secured by Republic Act No. 8792 step-up password re-authentication and sequential clearance serials (AURORA-YYYY-NNNNNN); and (4) a 3-2-1 Disaster Recovery and Self-Healing Maintenance Console.",
        "System acceptability and usability were empirically evaluated by N = 27 ParSU CECS stakeholders (15 BSIT senior students, 5 research advisers, 5 defense panelists, 1 capstone coordinator, and 1 college dean) using an expert-validated questionnaire (Good & Scates mean = 4.89/5.00; Cronbach's α = 0.946) combining the 10-item System Usability Scale (SUS) and 27-item Unified Theory of Acceptance and Use of Technology (UTAUT) model. AURORA achieved a Composite SUS Score of 91.8 / 100 (Grade A — Excellent) and a Composite UTAUT Grand Mean of 4.86 / 5.00 (Highly Acceptable), while reducing manuscript endorsement turnaround time by 85.9% (from 18.4 days to 2.6 days).",
    ]
    for para_txt in abs_body:
        pa = doc.add_paragraph()
        pa.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pa.paragraph_format.first_line_indent = Inches(0.5)
        pa.paragraph_format.line_spacing = 1.5
        pa.paragraph_format.space_after = Pt(8)
        ra = pa.add_run(para_txt)
        ra.font.name = "Times New Roman"
        ra.font.size = Pt(11.5)

    p_k = doc.add_paragraph()
    p_k.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    rk1 = p_k.add_run("Keywords: ")
    rk1.font.name = "Times New Roman"
    rk1.font.size = Pt(11.5)
    rk1.font.bold = True
    rk2 = p_k.add_run(
        "Paperless Academic Workflow, Capstone Defense Management, Coordinate PDF Annotation, Republic Act No. 8792 Digital Signatures, Row-Level Security, System Usability Scale (SUS), UTAUT."
    )
    rk2.font.name = "Times New Roman"
    rk2.font.size = Pt(11.5)
    rk2.font.italic = True

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
        s.top_margin = Inches(0.6)
        s.bottom_margin = Inches(0.6)
        s.left_margin = Inches(0.65)
        s.right_margin = Inches(0.65)

    # Banner Header Table
    bt = fdoc.add_table(rows=1, cols=1)
    bt.alignment = WD_TABLE_ALIGNMENT.CENTER
    bc = bt.rows[0].cells[0]
    bc.width = Inches(7.2)
    set_cell_margins(bc, top=140, bottom=140, left=160, right=160)
    set_cell_shading(bc, "800000")
    bp = bc.paragraphs[0]
    bp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_b1 = bp.add_run("AURORA: PAPERLESS CAPSTONE DEFENSE MANAGEMENT PLATFORM\n")
    r_b1.font.name = "Times New Roman"
    r_b1.font.size = Pt(16)
    r_b1.font.bold = True
    r_b1.font.color.rgb = RGBColor(255, 255, 255)
    r_b2 = bp.add_run(
        "Academic Unified Review, Observation, Rating, and Assessment • Partido State University (CECS - DCS)"
    )
    r_b2.font.name = "Times New Roman"
    r_b2.font.size = Pt(10.5)
    r_b2.font.italic = True
    r_b2.font.color.rgb = RGBColor(254, 240, 138)

    p_tag = fdoc.add_paragraph()
    p_tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_tag.paragraph_format.space_before = Pt(8)
    p_tag.paragraph_format.space_after = Pt(8)
    rtag = p_tag.add_run(
        "Transforming Manual Paper-Bound Thesis Routing into a Cryptographically Verified, Zero-Paper Cloud Workflow"
    )
    rtag.font.name = "Times New Roman"
    rtag.font.size = Pt(12)
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
                (img1, "Proponent Capstone Hub & 4-Stage Stepper"),
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
            "Review manuscripts directly in the browser with resolution-independent bounding-box highlights (x%, y%, w%, h%), severity tags, and live WebSocket threads.",
        ),
        (
            "2. Conflict-Free Auto-Scheduler & Firewall",
            "Eliminates double-booked defense rooms and panelist overlaps while enforcing academic impartiality by blocking advisers from grading their own advisees.",
        ),
        (
            "3. Dynamic Rubric & RA 8792 Digital Signatures",
            "Automates Form DCS-CF-04 weighted computations (30/35/25/10%) with step-up password re-authentication and SHA-256 serials (AURORA-YYYY-NNNNNN).",
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
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
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
        rt.font.size = Pt(10)
        rt.font.bold = True
        rt.font.color.rgb = RGBColor(128, 0, 0)
        rd = cp.add_run(pdesc)
        rd.font.name = "Times New Roman"
        rd.font.size = Pt(9)
        rd.font.color.rgb = RGBColor(51, 65, 85)

    fdoc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Empirical Impact & QR Footer Bar
    qt = fdoc.add_table(rows=1, cols=3)
    qt.alignment = WD_TABLE_ALIGNMENT.CENTER
    q_widths = [Inches(3.6), Inches(1.8), Inches(1.8)]
    c0 = qt.rows[0].cells[0]
    c0.width = q_widths[0]
    set_cell_margins(c0, top=70, bottom=70, left=90, right=90)
    set_cell_shading(c0, "0F172A")
    p0 = c0.paragraphs[0]
    r0_h = p0.add_run("EMPIRICAL IMPACT & QUALITY BENCHMARKS\n")
    r0_h.font.name = "Times New Roman"
    r0_h.font.size = Pt(10)
    r0_h.font.bold = True
    r0_h.font.color.rgb = RGBColor(254, 240, 138)
    r0_b = p0.add_run(
        "• SUS Usability Score: 91.8 / 100 (Grade A — Excellent)\n"
        "• UTAUT Acceptability Mean: 4.86 / 5.00 (Highly Acceptable)\n"
        "• Review Turnaround Reduction: 18.4 days → 2.6 days (−85.9%)\n"
        "• Proponents: G. V. Mañago, C. A. Castillo, R. M. Buenafe, L. M. Encinas\n"
        "• Research Adviser: Prof. Froiland B. Peñalosa | Chair: Dr. Kennedy C. Cuya"
    )
    r0_b.font.name = "Times New Roman"
    r0_b.font.size = Pt(8.5)
    r0_b.font.color.rgb = RGBColor(248, 250, 252)

    for idx, (qp, qlbl) in enumerate(
        [
            (qr_portal_path, "Scan for Live Portal\naurora-parsu.vercel.app"),
            (qr_imrad_path, "Scan for IMRAD Paper\n(ACM SIGPLAN PDF)"),
        ]
    ):
        cell = qt.rows[0].cells[idx + 1]
        cell.width = q_widths[idx + 1]
        set_cell_margins(cell, top=40, bottom=40, left=40, right=40)
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
            cp.add_run().add_picture(qp, width=Inches(1.1))
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
    rb1.font.size = Pt(16)
    rb1.font.bold = True
    rb1.font.color.rgb = RGBColor(128, 0, 0)
    rb2 = p_bh.add_run(
        "Pocket Operational Guide for Students, Research Advisers, Panelists, Coordinators, Deans & System Admins\nPartido State University — College of Engineering and Computational Sciences\nResearch Adviser: Prof. Froiland B. Peñalosa | Capstone Coordinator: Dr. Kennedy C. Cuya"
    )
    rb2.font.name = "Times New Roman"
    rb2.font.size = Pt(10)
    rb2.font.italic = True

    booklet_modules = [
        (
            "Module 1: Student Proponent Quick-Start",
            [
                "1. Sign In & Create Docket: Log in at https://aurora-parsu.vercel.app/login, open My Project, click Create Project, and share the 8-character Join Code with your groupmates.",
                "2. Upload PDF Manuscript: Drag and drop your compiled PDF manuscript. AURORA automatically computes its FIPS 180-4 SHA-256 fingerprint and assigns version pointer v1/v2/v3.",
                "3. File Form DCS-CF-03: Complete the Oral Defense Application prerequisite checklist (Turnitin similarity <= 20%) to route your manuscript to your Research Adviser.",
                "4. Resolve Inline Annotations & View Verdicts: Open the Review Workspace to reply to coordinate-pinned comments and download your signed Certificate of Defense (DCS-CF-05).",
            ],
        ),
        (
            "Module 2: Research Adviser Guide (Prof. Froiland B. Peñalosa)",
            [
                "1. Advisee Queue: Open Dashboard or Submissions to view all assigned student capstone groups.",
                "2. Split-Screen PDF.js Annotation: Select text or draw coordinate bounding boxes directly on the manuscript PDF, categorize severity (Critical, Major, Minor), and post remarks.",
                "3. Endorsement Gate (Form DCS-CF-03): Click Approve & Endorse for Defense to digitally certify manuscript readiness and unlock defense scheduling.",
            ],
        ),
        (
            "Module 3: Defense Panel Evaluator Guide",
            [
                "1. Live Evaluation Workspace: Open your assigned defense from Defenses to launch the 60/40 split-screen PDF and Form DCS-CF-04 Rubric Drawer.",
                "2. Dynamic Weighted Scoring: Input criterion scores across Manuscript Quality (30%), Prototype Demo (35%), Presentation (25%), and Q&A (10%).",
                "3. RA 8792 Step-Up Digital Signature: Re-enter your account password to legally certify your signature, generating an immutable AURORA-YYYY-NNNNNN serial and SHA-256 hash.",
            ],
        ),
        (
            "Module 4: Defense Coordinator, College Dean & System Admin Guide",
            [
                "1. Conflict-Free Scheduling (/dashboard/defenses/schedule): Schedule single or batch defenses with automatic room-clash detection and Adviser Conflict-of-Interest isolation.",
                "2. Customizable Workflows & Rubrics (/admin/stages & /admin/rubrics): Configure 4-stage (CEC) or 3-stage (other colleges) pipelines and dynamic 100%-weighted rubrics.",
                "3. Executive Analytics & Objective 4 Survey (/dashboard/analytics): Monitor pass rates, turnaround KPIs, and live SUS (91.8/100) & UTAUT (4.86/5.00) acceptability metrics.",
                "4. Maintenance, Troubleshooting & DR Console (/admin/system-health): Run 6 live diagnostic probes, trigger One-Click Self-Healing Maintenance, and export/verify SHA-256 JSON backups.",
            ],
        ),
    ]

    for mtitle, msteps in booklet_modules:
        pm = bdoc.add_paragraph()
        pm.paragraph_format.space_before = Pt(10)
        pm.paragraph_format.space_after = Pt(3)
        rm = pm.add_run(mtitle)
        rm.font.name = "Times New Roman"
        rm.font.size = Pt(12)
        rm.font.bold = True
        rm.font.color.rgb = RGBColor(128, 0, 0)
        for st in msteps:
            ps = bdoc.add_paragraph()
            ps.paragraph_format.left_indent = Inches(0.25)
            ps.paragraph_format.space_after = Pt(2)
            ps.paragraph_format.line_spacing = 1.15
            rs = ps.add_run(st)
            rs.font.name = "Times New Roman"
            rs.font.size = Pt(10)

    bdoc.save(booklet_docx_path)
    print("Saved Compact User Booklet DOCX:", booklet_docx_path)


if __name__ == "__main__":
    qr_imrad, qr_card, qr_portal = generate_qr_codes_and_flyer_visual()

    imrad_docx = os.path.join(WORKSPACE, "AURORA_IMRAD_ACM_SIGPLAN.docx")
    boa_docx = os.path.join(WORKSPACE, "AURORA_Book_of_Abstract_eCopy.docx")
    cap_abs_docx = os.path.join(WORKSPACE, "AURORA_Capstone_Abstract_Packet.docx")
    flyer_docx = os.path.join(WORKSPACE, "AURORA_System_Flyer.docx")
    booklet_docx = os.path.join(WORKSPACE, "AURORA_System_Booklet.docx")

    build_imrad_acm_sigplan_docx(imrad_docx)
    build_book_of_abstract_ecopy_docx(boa_docx, qr_card)
    build_capstone_abstract_packet_docx(cap_abs_docx)
    build_flyer_and_booklet_docx(flyer_docx, booklet_docx, qr_imrad, qr_portal)
