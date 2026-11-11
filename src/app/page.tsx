"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  MessageSquare,
  BarChart3,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  GraduationCap,
  Users,
  Eye,
  Award,
  Crown,
  Settings2,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import {
  APP_ACRONYM_MEANING,
  APP_FULL_NAME,
  INSTITUTION,
  INSTITUTION_CAMPUS,
} from "@/constants/app";

// The Five Colleges of Partido State University – Goa Campus
const COLLEGES = [
  {
    code: "CECS",
    name: "College of Engineering and Computational Sciences",
    desc: "Computer Science, Information Technology, Engineering, and Computational Research.",
    programs: ["BS in Information Technology", "BS in Computer Science", "BS in Civil Engineering"],
  },
  {
    code: "CED",
    name: "College of Education",
    desc: "Teacher Education, Educational Leadership, Curriculum Design, and Action Research.",
    programs: ["Bachelor of Secondary Education", "Bachelor of Elementary Education"],
  },
  {
    code: "CBM",
    name: "College of Business and Management",
    desc: "Business Administration, Financial Management, Hospitality, and Enterprise Studies.",
    programs: ["BS in Business Administration", "BS in Hospitality Management"],
  },
  {
    code: "CAH",
    name: "College of Arts and Humanities",
    desc: "Communication, Language Studies, Cultural Heritage, and Public Governance.",
    programs: ["BA in Communication", "BA in English Language", "BA in Political Science"],
  },
  {
    code: "CS",
    name: "College of Science",
    desc: "Applied Mathematics, Environmental Science, Biology, and Empirical Research.",
    programs: ["BS in Applied Mathematics", "BS in Environmental Science", "BS in Biology"],
  },
];

// The Six Stakeholder Roles
const ECOSYSTEM_ROLES = [
  {
    id: "student",
    title: "Student",
    subtitle: "Research Proponent & Author",
    icon: GraduationCap,
    desc: "Submit manuscripts, receive feedback, track revisions, and monitor academic defense progress.",
    metrics: "Upload PDF • Review Annotations • Download Certificates",
  },
  {
    id: "adviser",
    title: "Adviser",
    subtitle: "Guidance & Mentorship",
    icon: Eye,
    desc: "Guide student researchers, review manuscript progress, and endorse submissions.",
    metrics: "Paperless Consultations • Endorsement Gate • Non-Grading Boundary",
  },
  {
    id: "panelist",
    title: "Panelist",
    subtitle: "Evaluation & Examination",
    icon: Award,
    desc: "Review manuscripts, provide digital annotations, and complete rubric-based evaluations.",
    metrics: "Split-Screen Workspace • 100-Pt Rubrics • Digital E-Signatures",
  },
  {
    id: "coordinator",
    title: "Research Coordinator",
    subtitle: "Academic Operations",
    icon: Calendar,
    desc: "Manage academic workflows, schedules, panel assignments, and institutional reporting.",
    metrics: "Defense Calendar • Panel Composition • Conflict Auditing",
  },
  {
    id: "dean",
    title: "College Dean",
    subtitle: "Institutional Oversight",
    icon: Crown,
    desc: "Oversee college-wide academic defense activities, progress, and reporting.",
    metrics: "College Throughput • Program Completion • Strategic Clearance",
  },
  {
    id: "admin",
    title: "System Administrator",
    subtitle: "Platform Governance",
    icon: Settings2,
    desc: "Manage user accounts, access permissions, configurations, and technical operations.",
    metrics: "RBAC Governance • System Audit Trail • Tamper-Proof Logs",
  },
];

// The Five Defense Stages
const DEFENSE_STAGES = [
  {
    step: "01",
    name: "Concept Defense",
    desc: "Establish the initial research concept and obtain academic feedback.",
    deliverable: "Concept Note & Scope",
  },
  {
    step: "02",
    name: "Title Defense",
    desc: "Present and evaluate the proposed research title.",
    deliverable: "Title Docket & Proponents",
  },
  {
    step: "03",
    name: "Progress Report 1",
    desc: "Monitor research development and initial manuscript progress.",
    deliverable: "Chapters 1–3 Framework",
  },
  {
    step: "04",
    name: "Progress Report 2",
    desc: "Review continued research progress and required improvements.",
    deliverable: "Preliminary Results & System",
  },
  {
    step: "05",
    name: "Final Defense",
    desc: "Complete the final academic evaluation and defense process.",
    deliverable: "Full Manuscript & Verdict",
  },
];

// The Seven Core Capabilities (Vector Micro-Preview — No raster screenshots)
const CORE_CAPABILITIES = [
  {
    num: "01",
    title: "Manuscript Management",
    desc: "Centralized digital submission and manuscript version control.",
    icon: FileText,
    badgeText: "SHA-256: 8f4a...d91c • Immutable Lock",
    badgeType: "emerald",
    details: "Supports immutable PDF versions, SHA-256 upload checksums, and strict timeline locking.",
  },
  {
    num: "02",
    title: "Digital Annotation",
    desc: "Contextual comments, suggestions, replies, and manuscript review.",
    icon: MessageSquare,
    badgeText: "Coord: [Pg 14, 120×340] • Threaded Reply",
    badgeType: "blue",
    details: "Coordinate-based PDF text highlighting with threaded discussions between adviser, panel, and student.",
  },
  {
    num: "03",
    title: "Rubric-Based Assessment",
    desc: "Structured evaluation through configurable criteria and weighted scoring.",
    icon: BarChart3,
    badgeText: "30% Weighted Criteria • 100-Pt Scale",
    badgeType: "indigo",
    details: "Institutional rubric templates with weighted percentages, passing standards, and qualitative remarks.",
  },
  {
    num: "04",
    title: "Automated Scoring",
    desc: "Automatic computation of evaluation scores based on configured rubrics.",
    icon: Layers,
    badgeText: "Σ(Weight × Score) = 95.8% Passed",
    badgeType: "blue",
    details: "Real-time weighted score calculation, statistical consensus deviations, and panel consensus tracking.",
  },
  {
    num: "05",
    title: "Revision Tracking",
    desc: "Organized manuscript versions and revision history.",
    icon: History,
    badgeText: "v1.0 → v1.1 • 14 Annotations Addressed",
    badgeType: "amber",
    details: "Side-by-side manuscript version comparisons and 'Addressed' state verification for student revisions.",
  },
  {
    num: "06",
    title: "Defense Scheduling",
    desc: "Centralized scheduling, panel assignments, and workflow coordination.",
    icon: Calendar,
    badgeText: "Room 204 • 10:00 AM – 11:30 AM • Confirmed",
    badgeType: "purple",
    details: "Room designation, multi-day calendar batch grids, conflict checks, and persistent session links.",
  },
  {
    num: "07",
    title: "Analytics and Accountability",
    desc: "Institutional reporting, activity monitoring, and audit trails.",
    icon: ShieldCheck,
    badgeText: "100% Audit Coverage • ISO 25010 Standard",
    badgeType: "emerald",
    details: "ISO 25010 operational telemetry, dean-level throughput graphs, and immutable activity audit logs.",
  },
];

export default function AuroraMasterLandingPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<"split" | "grading">("split");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#050505] dark:text-[#F5F5F5] antialiased selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden transition-colors duration-200">
      
      {/* =========================================================================
          SECTION A — MINIMALIST NAVIGATION BAR (Light & Dark Mode Enabled)
      ========================================================================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-zinc-200 dark:border-[#252525] transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          
          {/* Left: Geometric A Symbol + Wordmark */}
          <Link href="/" className="flex items-center gap-3.5 group select-none">
            <div className="relative h-8 w-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/aurora-symbol-transparent.png"
                alt="AURORA A Symbol"
                width={32}
                height={32}
                priority
                className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-[0.25em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
                AURORA
              </span>
              <span className="text-[9px] font-medium tracking-wider text-zinc-500 dark:text-[#929292] uppercase">
                Partido State University
              </span>
            </div>
          </Link>

          {/* Center/Right: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#overview" className="text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">
              Overview
            </a>
            <a href="#platform" className="text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">
              Platform
            </a>
            <a href="#workflow" className="text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">
              Academic Workflow
            </a>
            <a href="#about" className="text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">
              About
            </a>

            <div className="h-4 w-px bg-zinc-200 dark:bg-[#252525]" />

            <Link
              href="/verify"
              className="text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors"
            >
              Verify
            </Link>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 dark:border-[#252525] bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors cursor-pointer"
              aria-label="Toggle light/dark mode"
              title={mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              )}
            </button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-[#F5F5F5] dark:text-[#050505] text-xs font-semibold dark:hover:bg-white transition-all duration-200 shadow-sm"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Right Controls: Theme Toggle + Menu */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 dark:border-[#252525] bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292]"
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] hover:bg-zinc-100 dark:hover:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525]"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-[#252525] px-6 py-4 space-y-3"
            >
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] py-1"
              >
                Overview
              </a>
              <a
                href="#platform"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] py-1"
              >
                Platform
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] py-1"
              >
                Academic Workflow
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] py-1"
              >
                About
              </a>
              <Link
                href="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] py-1"
              >
                Public Certificate Verification
              </Link>
              <div className="pt-2 border-t border-zinc-200 dark:border-[#252525]">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-[#F5F5F5] dark:text-[#050505] text-xs font-semibold"
                >
                  Sign In to Portal
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* =========================================================================
          SECTION B — HERO EXPERIENCE
          Centerpiece: Large centered A symbol + Editorial Typography + CTAs
      ========================================================================= */}
      <section className="relative min-h-[92vh] pt-32 pb-24 px-6 flex flex-col items-center justify-center text-center overflow-hidden border-b border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#050505] transition-colors">
        
        {/* Subtle architectural ambient background grid */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-8">
          
          {/* Restrained Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-[#252525] bg-zinc-100/80 dark:bg-[#0A0A0A] text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-[#929292]"
          >
            <span>{INSTITUTION_CAMPUS}</span>
          </motion.div>

          {/* THE OFFICIAL GEOMETRIC A SYMBOL — THE CENTERPIECE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="relative h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center my-2"
          >
            <Image
              src="/aurora-symbol-transparent.png"
              alt="Official AURORA Geometric Symbol"
              width={144}
              height={144}
              priority
              className="object-contain dark:brightness-100 brightness-0 transition-all duration-200 drop-shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_24px_rgba(255,255,255,0.08)] select-none"
            />
          </motion.div>

          {/* AURORA Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-1.5"
          >
            <h2 className="text-sm font-bold tracking-[0.35em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
              AURORA
            </h2>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-[#929292] uppercase tracking-wider">
              {APP_ACRONYM_MEANING}
            </p>
          </motion.div>

          {/* Main Editorial Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-zinc-900 dark:text-[#F5F5F5] font-display max-w-3xl"
          >
            Every Defense.
            <br />
            One Unified Experience.
          </motion.h1>

          {/* Concise Supporting Description */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm sm:text-base text-zinc-600 dark:text-[#929292] max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Bringing research, capstone, thesis, and dissertation defense workflows into one connected digital platform.
          </motion.p>

          {/* Clear Calls to Action */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-2"
          >
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white hover:bg-black dark:bg-[#F5F5F5] dark:text-[#050505] text-xs font-bold dark:hover:bg-white transition-all shadow-md group cursor-pointer"
            >
              <span>Access AURORA</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#overview"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#0A0A0A] hover:bg-zinc-100 dark:hover:bg-[#141414] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] text-xs font-semibold transition-all cursor-pointer"
            >
              Explore the Platform
            </a>
          </motion.div>
        </div>
      </section>

      {/* =========================================================================
          SECTION C — THE PURPOSE (THE CHALLENGE)
          Minimalist Editorial Columns
      ========================================================================= */}
      <section id="overview" className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-zinc-50/50 dark:bg-[#050505] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="space-y-4 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              The Challenge
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              Academic excellence shouldn&apos;t be slowed down by paperwork.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#929292] leading-relaxed">
              Academic defenses involve students, advisers, panelists, and administrators working through manuscripts, evaluations, schedules, and revisions. When these processes remain fragmented across physical documents and manual procedures, valuable time and resources are lost.
            </p>
          </div>

          {/* Three Minimalist Editorial Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-[#929292] font-mono">
                01 — Problem
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Fragmented Processes
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Manuscripts, evaluation forms, schedules, and feedback are handled through disconnected processes across physical folders and emails.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-[#929292] font-mono">
                02 — Problem
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Delayed Feedback
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Manual evaluation and scattered revision records make academic progress difficult to monitor, causing administrative latency for students.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-[#929292] font-mono">
                03 — Problem
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Administrative Complexity
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Coordinating panelists, defense schedules, evaluations, and academic records creates unnecessary administrative work for coordinators and deans.
              </p>
            </div>
          </div>

          {/* Editorial Transition */}
          <div className="pt-6 border-t border-zinc-200 dark:border-[#252525] flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F5] uppercase tracking-wider">
              AURORA brings these processes together.
            </p>
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-500" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D — THE AURORA ECOSYSTEM
          Six Interconnected Stakeholders
      ========================================================================= */}
      <section id="platform" className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="space-y-3 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              The Architecture
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              One platform.
              <br />
              Every academic stakeholder.
            </h2>
            <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
              Enforcing academic separation of duties across all six institutional roles in a unified, synchronized docket.
            </p>
          </div>

          {/* 6 Stakeholder Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ECOSYSTEM_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  className="p-7 rounded-2xl bg-zinc-50/70 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-5 transition-all hover:border-zinc-300 dark:hover:border-[#383838]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex items-center justify-center text-zinc-900 dark:text-[#F5F5F5]">
                        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-[#929292]">
                        {role.subtitle}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                      {role.title}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                      {role.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-200/80 dark:border-[#1F1F1F]">
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-[#929292] block truncate">
                      {role.metrics}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E — THE ACADEMIC DEFENSE JOURNEY
          Five Academic Defense Stages Timeline
      ========================================================================= */}
      <section id="workflow" className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-zinc-50/50 dark:bg-[#050505] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                Defense Lifecycle
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                From initial proposal to final approval.
              </h2>
            </div>
            
            {/* Visual Anchor: Geometric A Symbol Motif */}
            <div className="h-10 w-10 flex items-center justify-center opacity-60">
              <Image
                src="/aurora-symbol-transparent.png"
                alt="A Symbol Anchor"
                width={36}
                height={36}
                className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
              />
            </div>
          </div>

          {/* Horizontal Timeline (Desktop) & Vertical (Mobile) */}
          <div className="relative">
            {/* Connecting subtle progression line */}
            <div className="hidden lg:block absolute top-7 left-6 right-6 h-px bg-zinc-200 dark:bg-[#252525] -z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
              {DEFENSE_STAGES.map((stg) => (
                <div
                  key={stg.step}
                  className="p-6 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-[#383838] transition-colors shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-500 font-mono">
                        {stg.step}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-[#929292] uppercase">
                        Stage {stg.step}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                      {stg.name}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                      {stg.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-[#1F1F1F]">
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block truncate">
                      {stg.deliverable}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F — FLAGSHIP INNOVATION: SPLIT-SCREEN WORKSPACE
          Vector Digital Interface Preview (No Raster Screenshots)
      ========================================================================= */}
      <section className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="space-y-4 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              The Signature Experience
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              Review and evaluate.
              <br />
              Without switching contexts.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#929292] leading-relaxed">
              AURORA&apos;s split-screen annotation workspace allows panelists to examine manuscripts while simultaneously completing rubric-based evaluations in one integrated interface.
            </p>
          </div>

          {/* Interactive Mode Toggle for the Vector Showcase */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveWorkspaceView("split")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeWorkspaceView === "split"
                  ? "bg-zinc-900 text-white dark:bg-[#F5F5F5] dark:text-[#050505] shadow-xs"
                  : "bg-zinc-100 dark:bg-[#050505] text-zinc-600 dark:text-[#929292] border border-zinc-200 dark:border-[#252525] hover:text-zinc-900 dark:hover:text-[#F5F5F5]"
              }`}
            >
              1. Split-Screen Review & Endorsement
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspaceView("grading")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeWorkspaceView === "grading"
                  ? "bg-zinc-900 text-white dark:bg-[#F5F5F5] dark:text-[#050505] shadow-xs"
                  : "bg-zinc-100 dark:bg-[#050505] text-zinc-600 dark:text-[#929292] border border-zinc-200 dark:border-[#252525] hover:text-zinc-900 dark:hover:text-[#F5F5F5]"
              }`}
            >
              2. Section IV Rubric Grading Panel
            </button>
          </div>

          {/* PURE VECTOR DIGITAL INTERFACE MOCKUP (Zero raster screenshots) */}
          <div className="relative rounded-2xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#050505] overflow-hidden shadow-2xl transition-colors">
            
            {/* Top Browser / Application Chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-[#252525] text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 font-mono text-[11px] text-zinc-500 dark:text-[#929292] hidden sm:inline-block">
                  aurora.parsu.edu.ph/workspace/BSIT-2026-FINAL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Defense Session
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-[#929292] hidden md:inline-block">
                  RA 8792 Secured
                </span>
              </div>
            </div>

            {/* Split Screen Workspace Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
              
              {/* Left Pane: Manuscript PDF Viewer Engine (7 columns) */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#070707]">
                
                {/* PDF Viewer Header Toolbar */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-[#1F1F1F] text-[11px] font-mono text-zinc-500 dark:text-[#929292]">
                  <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-md">
                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      PARSU-DCS-2026-FINAL-MANUSCRIPT.pdf
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-zinc-100 dark:bg-[#141414] px-2 py-0.5 rounded text-[10px]">Page 14 / 82</span>
                    <span className="bg-zinc-100 dark:bg-[#141414] px-2 py-0.5 rounded text-[10px]">100%</span>
                  </div>
                </div>

                {/* Simulated Manuscript Content Sheet */}
                <div className="my-6 p-6 sm:p-8 rounded-xl bg-zinc-50 dark:bg-[#0D0D0D] border border-zinc-200 dark:border-[#1F1F1F] shadow-inner space-y-4 font-serif">
                  <div className="text-center space-y-1 font-sans border-b border-zinc-200/60 dark:border-[#222] pb-3">
                    <p className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
                      Partido State University · Goa Campus
                    </p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      College of Engineering and Computational Sciences
                    </p>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis &amp; Dissertation Papers
                  </h4>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                    The centralized defense docket utilizes cryptographic checksum verification to preserve document integrity throughout all defense stages. Reviewers can anchor contextual observations directly to manuscript coordinates...
                  </p>

                  {/* Interactive Highlight Block with Annotation Indicator */}
                  <div className="relative p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 text-xs font-sans text-amber-900 dark:text-amber-200 leading-relaxed my-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold mb-1">
                      <span>§ 3.4 Automated Score Computation &amp; Statistical Consensus</span>
                      <span className="bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.2 rounded text-[9px]">Annotation #1</span>
                    </div>
                    &ldquo;The evaluation engine calculates weighted composite ratings across all panel members in real time, validating compliance with institutional passing marks...&rdquo;
                  </div>

                  {/* Contextual Threaded Comment Bubble */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#141414] border border-blue-500/30 shadow-sm space-y-2 font-sans">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          KC
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                            Dr. Kennedy C. Cuya
                          </p>
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Panel Chair · Today at 10:42 AM</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Resolved in Rev 2
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-normal pl-8">
                      Please confirm that the statistical distribution formula used for panel score consensus reflects the revised 2026 guidelines.
                    </p>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-[#929292]">
                  <span>SHA-256: 7f9b8c2e...3d1a4e5f</span>
                  <span className="text-blue-600 dark:text-blue-400">Direct Coordinate Highlight Active</span>
                </div>
              </div>

              {/* Right Pane: Dynamic Mode Switcher (5 columns) */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-zinc-50/70 dark:bg-[#0A0A0A]">
                {activeWorkspaceView === "split" ? (
                  /* VIEW 1: Adviser Endorsement & Panel Composition Docket */
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                        Stage 05 Milestone
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                        Final Defense Clearance
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-[#929292]">
                        Proponent: Team CyberDefense (BSIT Senior Proponents)
                      </p>
                    </div>

                    {/* Adviser Endorsement Checklist Card */}
                    <div className="p-4 rounded-xl bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-3">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Adviser Endorsement Checkpoints
                      </p>
                      
                      <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-[#1F1F1F]">
                          <span>Similarity Index Verified</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">11.4% (&lt;15%)</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-[#1F1F1F]">
                          <span>Chapters 1–5 Revisions</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Completed (14/14)</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span>Institutional Clearance</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Approved</span>
                        </div>
                      </div>
                    </div>

                    {/* Panel Assignees */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-[#929292]">
                        Assigned Panel Members
                      </p>
                      <div className="space-y-1.5">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Dr. Kennedy C. Cuya</span>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">Panel Chair</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Michael B. Amata</span>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Panel Member</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Prof. Maria Santos</span>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Panel Member</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <div className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                        <Check className="h-4 w-4" />
                        <span>Adviser Endorsement Confirmed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW 2: Section IV Dynamic Rubric Grading Sliders */
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                        Institutional Rubric · Section IV
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                        Technical Rigor &amp; Methodology
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-[#929292]">
                        Weight: 30% · Standard University Defense Rubric
                      </p>
                    </div>

                    {/* 4 Evaluation Criteria Sliders */}
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">1. Problem Formulation &amp; Scope (25%)</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">9.5 / 10</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-[#252525] overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: "95%" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">2. Research &amp; Software Rigor (35%)</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">9.8 / 10</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-[#252525] overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: "98%" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">3. ISO 25010 Quality Model (25%)</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">9.2 / 10</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-[#252525] overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: "92%" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">4. Oral Defense Response (15%)</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">9.6 / 10</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-[#252525] overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: "96%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Computed Total Score & Verdict Box */}
                    <div className="p-4 rounded-xl bg-white dark:bg-[#050505] border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-mono text-zinc-500 dark:text-[#929292] uppercase">Computed Weighted Total</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">95.8%</p>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        PASSED WITH MERIT
                      </span>
                    </div>

                    {/* Cryptographic E-Signature Stamp */}
                    <div className="pt-1 text-[10px] font-mono text-zinc-500 dark:text-[#929292] space-y-0.5">
                      <p>✓ Digitally Sealed: Michael B. Amata (Panelist)</p>
                      <p>RSA-2048 • SHA-256 Checksum: 0x8a9f...3e1b</p>
                    </div>
                  </div>
                )}

                {/* Bottom Vector Showcase Bar */}
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-[#1F1F1F] flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-[#929292]">
                  <span>Vector Interface • 0ms Delay</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase">Real-Time Evaluation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Architectural Elements Highlighted */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4">
            {[
              "Manuscript Viewing",
              "Inline Digital Annotations",
              "Contextual Feedback",
              "Evaluation Rubrics",
              "Automated Score Computation",
            ].map((feature, i) => (
              <div
                key={feature}
                className="p-4 rounded-xl bg-zinc-50/70 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-1 text-center sm:text-left transition-colors"
              >
                <span className="text-[9px] font-mono text-blue-600 dark:text-blue-500 font-bold">0{i + 1}</span>
                <p className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F5] leading-snug">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION G — CORE CAPABILITIES (Vector Badges — No Raster Screenshots)
      ========================================================================= */}
      <section className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-zinc-50/50 dark:bg-[#050505] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="space-y-3 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              System Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              Everything connected.
              <br />
              Nothing scattered.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.num}
                  className="p-7 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-6 hover:border-zinc-300 dark:hover:border-[#383838] transition-colors shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-500">
                        {cap.num}
                      </span>
                      <Icon className="h-4 w-4 text-zinc-400 dark:text-[#929292]" />
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                      {cap.title}
                    </h3>

                    <p className="text-xs text-zinc-800 dark:text-[#F5F5F5]/80 font-medium leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-[#1F1F1F]">
                    {/* Inline Vector Micro-Badge Preview */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-[#141414] border border-zinc-200 dark:border-[#252525] text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">{cap.badgeText}</span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-[#929292] leading-relaxed">
                      {cap.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION H — PAPERLESS BY DESIGN
          Responsible Academic Workflow & Sustainability
      ========================================================================= */}
      <section className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="space-y-4 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              A More Responsible Academic Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              Less paper. More progress.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#929292] leading-relaxed">
              By digitizing manuscript submissions, evaluations, and academic records, AURORA supports more sustainable and organized academic defense processes aligned with Partido State University&apos;s institutional Green IT goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-zinc-50/70 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Reduced Printed Manuscripts
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Eliminates the logistical burden of printing multiple reams of draft papers per stage for defense panelists and advisers.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-50/70 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-3">
              <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Centralized Academic Records
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Retains tamper-evident digital records of evaluation forms, weighted score sheets, and signed verdict certificates in one cloud repository.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-50/70 dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-3">
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                Accessible Digital Feedback
              </h3>
              <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                Provides researchers instant access to persistent annotations, comments, and directives directly anchored to their manuscript pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION I — INSTITUTIONAL COVERAGE
          The Five Constituent Colleges
      ========================================================================= */}
      <section id="about" className="py-28 px-6 border-b border-zinc-200 dark:border-[#252525] bg-zinc-50/50 dark:bg-[#050505] transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="space-y-4 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
              Institutional Reach
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              One university. Five colleges.
              <br />
              A connected academic process.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#929292] leading-relaxed">
              Configured specifically for the academic programs of Partido State University – Goa Campus, with isolated college coordination and dean dockets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COLLEGES.map((col) => (
              <div
                key={col.code}
                className="p-7 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-5 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-500">
                      {col.code}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-zinc-500 dark:text-[#929292]">
                      Goa Campus
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                    {col.name}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    {col.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-[#1F1F1F] space-y-1">
                  <p className="text-[10px] font-mono text-zinc-500 dark:text-[#929292] uppercase">Key Programs</p>
                  <p className="text-[11px] text-zinc-800 dark:text-[#F5F5F5] font-medium truncate">
                    {col.programs.join(" • ")}
                  </p>
                </div>
              </div>
            ))}

            {/* University Summary Box */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-blue-500/30 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  PARSU · GOA
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                  {INSTITUTION}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                  San Juan Bautista, Goa, Camarines Sur, Philippines 4422. Official research docket and academic defense system.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-[#1F1F1F]">
                <Link
                  href="/verify"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                >
                  <span>Public Accreditation Portal</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION J — FINAL CALL TO ACTION & MINIMAL FOOTER
      ========================================================================= */}
      <section className="py-28 px-6 bg-white dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-[#252525] transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          
          {/* Centered Geometric A Symbol */}
          <div className="relative h-20 w-20 flex items-center justify-center">
            <Image
              src="/aurora-symbol-transparent.png"
              alt="AURORA A Symbol"
              width={80}
              height={80}
              className="object-contain dark:brightness-100 brightness-0 transition-all duration-200"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
              Your academic journey.
              <br />
              A clearer way forward.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#929292] max-w-lg mx-auto leading-relaxed">
              From concept defense to final approval, bring every academic defense process into one connected experience.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-zinc-900 text-white hover:bg-black dark:bg-[#F5F5F5] dark:text-[#050505] text-xs font-bold dark:hover:bg-white transition-all shadow-md group cursor-pointer"
            >
              <span>Enter AURORA</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/verify"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#050505] hover:bg-zinc-100 dark:hover:bg-[#141414] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] text-xs font-semibold transition-all cursor-pointer"
            >
              Verify Certificate
            </Link>
          </div>

          <p className="text-[11px] font-mono text-zinc-500 dark:text-[#929292] tracking-wider uppercase pt-4">
            {INSTITUTION_CAMPUS}
          </p>
        </div>
      </section>

      {/* Minimal Editorial Footer */}
      <footer className="py-12 px-6 bg-zinc-100 dark:bg-[#050505] text-xs text-zinc-500 dark:text-[#929292] transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand Left */}
          <div className="flex items-center gap-3">
            <Image
              src="/aurora-symbol-transparent.png"
              alt="AURORA Symbol"
              width={20}
              height={20}
              className="object-contain opacity-70 dark:brightness-100 brightness-0 transition-all duration-200"
            />
            <span className="text-xs font-bold tracking-widest uppercase text-zinc-900 dark:text-[#F5F5F5]">
              AURORA
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-[#929292] font-mono">
              • {APP_FULL_NAME}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 text-[11px]">
            <a href="#overview" className="hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">Overview</a>
            <a href="#platform" className="hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">Platform</a>
            <a href="#workflow" className="hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">Workflow</a>
            <Link href="/verify" className="hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">Verification</Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors">Sign In</Link>
          </div>

          {/* Copyright & Institution */}
          <div className="text-center md:text-right text-[10px] text-zinc-500 dark:text-[#929292]">
            &copy; {new Date().getFullYear()} Partido State University. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
