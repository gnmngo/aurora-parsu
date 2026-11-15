"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  BarChart3,
  Calendar,
  Layers,
  History,
  ShieldCheck,
  GraduationCap,
  Eye,
  Award,
  Crown,
  Settings2,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  CheckCircle2,
  Play,
  Pause,
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
    programs: ["BS Information Technology", "BS Computer Science", "BS Civil Engineering"],
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
    programs: ["BS Business Administration", "BS Hospitality Management"],
  },
  {
    code: "CAH",
    name: "College of Arts and Humanities",
    desc: "Communication, Language Studies, Cultural Heritage, and Public Governance.",
    programs: ["BA Communication", "BA English Language", "BA Political Science"],
  },
  {
    code: "CS",
    name: "College of Science",
    desc: "Applied Mathematics, Environmental Science, Biology, and Empirical Research.",
    programs: ["BS Applied Mathematics", "BS Environmental Science", "BS Biology"],
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

// Core Capabilities Strip
const CORE_CAPABILITIES = [
  {
    num: "01",
    title: "Manuscript Management",
    desc: "Immutable PDF version chains with SHA-256 upload checksums.",
    icon: FileText,
    badgeText: "SHA-256: 8f4a...d91c",
  },
  {
    num: "02",
    title: "Digital Annotation",
    desc: "Coordinate-based PDF highlights and threaded review discussions.",
    icon: MessageSquare,
    badgeText: "Inline PDF Ribbon",
  },
  {
    num: "03",
    title: "Rubric Assessment",
    desc: "Configurable criteria weights and threshold-driven Pass/Fail verdicts.",
    icon: BarChart3,
    badgeText: "100-Pt Weighted Scale",
  },
  {
    num: "04",
    title: "Automated Scoring",
    desc: "Real-time composite average calculation and discrepancy alerts.",
    icon: Layers,
    badgeText: "Σ(Weight × Score)",
  },
  {
    num: "05",
    title: "Defense Scheduling",
    desc: "Room allocation, panel assignment, and conflict-free calendar grids.",
    icon: Calendar,
    badgeText: "Live Docket Sync",
  },
  {
    num: "06",
    title: "ISO 25010 Governance",
    desc: "RA 8792 digital signatures, QR verification, and security audit logs.",
    icon: ShieldCheck,
    badgeText: "100% Audit Trail",
  },
];

const SLIDES = [
  { id: "welcome", label: "Welcome", durationMs: 6500 },
  { id: "overview", label: "Overview", durationMs: 7000 },
  { id: "platform", label: "Platform", durationMs: 7000 },
  { id: "workflow", label: "Academic Workflow", durationMs: 7000 },
  { id: "workspace", label: "Workspace", durationMs: 8500 },
  { id: "about", label: "About", durationMs: 7000 },
] as const;

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    scale: 0.98,
  }),
};

export default function AuroraMasterLandingPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Slide Deck States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Workspace Slide Sub-View ("split" vs "grading")
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<"split" | "grading">("split");
  const manualWorkspaceOverrideRef = useRef(false);
  const lastWheelTimeRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goToSlide = useCallback(
    (targetIndex: number, customDir?: number) => {
      const normalized = ((targetIndex % SLIDES.length) + SLIDES.length) % SLIDES.length;
      if (normalized === currentSlide) {
        setProgress(0);
        return;
      }
      const computedDir =
        customDir !== undefined
          ? customDir
          : normalized > currentSlide
            ? 1
            : -1;
      setDirection(computedDir);
      setCurrentSlide(normalized);
      setProgress(0);
      if (normalized === 4) {
        setActiveWorkspaceView("split");
        manualWorkspaceOverrideRef.current = false;
      }
    },
    [currentSlide]
  );

  const handleNext = useCallback(() => {
    goToSlide(currentSlide + 1, 1);
  }, [currentSlide, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide(currentSlide - 1, -1);
  }, [currentSlide, goToSlide]);

  // Automatic Slide Progression Timer
  useEffect(() => {
    if (!isAutoPlaying || isHoverPaused || mobileMenuOpen) return;

    const slideDuration = SLIDES[currentSlide].durationMs;
    const tickMs = 50;
    const increment = (tickMs / slideDuration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextVal = prev + increment;
        // On Slide 05 (Workspace), automatically flip to Rubric Grading view at 50%
        if (
          currentSlide === 4 &&
          nextVal >= 50 &&
          prev < 50 &&
          !manualWorkspaceOverrideRef.current
        ) {
          setActiveWorkspaceView("grading");
        }
        if (nextVal >= 100) {
          return 100;
        }
        return nextVal;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [currentSlide, isAutoPlaying, isHoverPaused, mobileMenuOpen]);

  // Advance slide when progress reaches 100%
  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  }, [progress, handleNext]);

  // Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === " ") {
        // Spacebar toggles play/pause when not focused on a button/link
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "BUTTON" && tag !== "A" && tag !== "INPUT") {
          e.preventDefault();
          setIsAutoPlaying((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Debounced Mouse Wheel Navigation on Desktop
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) return;
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 750) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 28) return;

      lastWheelTimeRef.current = now;
      if (delta > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  return (
    <div
      onWheel={handleWheel}
      className="min-h-screen lg:h-screen bg-white text-zinc-900 dark:bg-[#050505] dark:text-[#F5F5F5] antialiased selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden lg:overflow-hidden flex flex-col justify-between relative transition-colors duration-200"
    >
      {/* Subtle architectural ambient background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* =========================================================================
          TOP NAVIGATION BAR (Fixed Slide Tabs + Theme Toggle + Sign In)
      ========================================================================= */}
      <nav className="relative z-50 bg-white/85 dark:bg-[#050505]/85 backdrop-blur-md border-b border-zinc-200 dark:border-[#252525] shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Geometric A Symbol + Wordmark (Clicks to Slide 01 Welcome) */}
          <button
            type="button"
            onClick={() => goToSlide(0, -1)}
            className="flex items-center gap-3.5 group select-none text-left cursor-pointer"
          >
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
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-[0.25em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
                  AURORA
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  Paperless
                </span>
              </div>
              <span className="text-[9px] font-medium tracking-wider text-zinc-500 dark:text-[#929292] uppercase">
                Partido State University
              </span>
            </div>
          </button>

          {/* Center/Right: Desktop Slide Tabs + Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {SLIDES.slice(1).map((slide, idx) => {
              const slideIndex = idx + 1;
              const isActive = currentSlide === slideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(slideIndex)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="landing-active-nav-pill"
                      className="absolute inset-0 rounded-lg bg-zinc-100 dark:bg-[#141414] border border-zinc-200/80 dark:border-[#252525] -z-10"
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    />
                  )}
                  {slide.label}
                </button>
              );
            })}

            <div className="h-4 w-px bg-zinc-200 dark:bg-[#252525] mx-2" />

            <Link
              href="/verify"
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors"
            >
              Verify
            </Link>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-200 dark:border-[#252525] bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors cursor-pointer mx-1"
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

          {/* Mobile Controls */}
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
              className="md:hidden bg-white dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-[#252525] px-6 py-4 space-y-2"
            >
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    goToSlide(idx);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left text-xs font-semibold py-1.5 ${
                    currentSlide === idx
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-600 dark:text-[#929292]"
                  }`}
                >
                  0{idx + 1}. {s.label}
                </button>
              ))}
              <Link
                href="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-medium text-zinc-600 dark:text-[#929292] py-1.5"
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
          MAIN ANIMATED SLIDE DECK STAGE
      ========================================================================= */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6 lg:py-4 overflow-y-auto lg:overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 01: WELCOME / HERO
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 0 && (
            <motion.section
              key="slide-welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-6"
            >
              {/* Restrained Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-[#252525] bg-zinc-100/80 dark:bg-[#0A0A0A] text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-[#929292]">
                <span>{INSTITUTION_CAMPUS}</span>
                <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  Paperless Defense Ecosystem
                </span>
              </div>

              {/* Official Geometric A Symbol */}
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center">
                <Image
                  src="/aurora-symbol-transparent.png"
                  alt="Official AURORA Geometric Symbol"
                  width={128}
                  height={128}
                  priority
                  className="object-contain dark:brightness-100 brightness-0 transition-all duration-200 drop-shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_24px_rgba(255,255,255,0.08)] select-none"
                />
              </div>

              {/* AURORA Wordmark */}
              <div className="space-y-1">
                <h2 className="text-sm font-bold tracking-[0.35em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
                  AURORA
                </h2>
                <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-[#929292] uppercase tracking-wider">
                  {APP_ACRONYM_MEANING}
                </p>
              </div>

              {/* Main Editorial Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.06] text-zinc-900 dark:text-[#F5F5F5] font-display max-w-4xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                  Paperless
                </span>{" "}
                Academic Defense.
                <br />
                One Unified Experience.
              </h1>

              {/* Supporting Description */}
              <p className="text-xs sm:text-base text-zinc-600 dark:text-[#929292] max-w-2xl mx-auto font-normal leading-relaxed">
                The dedicated paperless workflow platform for{" "}
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                  Research, Capstone, Thesis &amp; Dissertation Papers
                </strong>{" "}
                at Partido State University. Eliminating printed drafts, streamlining adviser endorsement gates, and automating rubric evaluations.
              </p>

              {/* Calls to Action */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white hover:bg-black dark:bg-[#F5F5F5] dark:text-[#050505] text-xs font-bold dark:hover:bg-white transition-all shadow-md group cursor-pointer"
                >
                  <span>Access AURORA</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>

                <button
                  type="button"
                  onClick={() => goToSlide(1, 1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#0A0A0A] hover:bg-zinc-100 dark:hover:bg-[#141414] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Explore the Platform</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 02: OVERVIEW (THE CHALLENGE & GREEN IT TRANSFORMATION)
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 1 && (
            <motion.section
              key="slide-overview"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-6xl mx-auto space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                    01 · Overview — The Challenge &amp; Green IT Transformation
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                    Academic excellence shouldn&apos;t be slowed down by paperwork.
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                  Zero Paper Reams · 100% Digital Docket
                </span>
              </div>

              {/* Three Editorial Challenge Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-2xl bg-zinc-50/80 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-rose-500 font-mono">
                    01 — Bottleneck
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                    Fragmented Physical Processes
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Printed manuscripts, paper evaluation sheets, schedules, and revision notes scattered across folders and manual sign-offs.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50/80 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500 font-mono">
                    02 — Bottleneck
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                    Delayed Consultation Feedback
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Manual rubric computation and unanchored revision remarks make academic progress slow to verify for students and advisers.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50/80 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 font-mono">
                    03 — Bottleneck
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                    Administrative Complexity
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Coordinating defense committees, room schedules, consensus grading, and DCS forms manually burdens coordinators and deans.
                  </p>
                </div>
              </div>

              {/* Three Green IT Solutions Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#080808] border border-emerald-500/25 shadow-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Sustainable Paperless Review
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Eliminates printing multiple reams of draft manuscripts per defense stage across Partido State University.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#080808] border border-blue-500/25 shadow-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      Tamper-Evident Records
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Preserves SHA-256 manuscript versions, weighted rubric sheets, and QR-verifiable certificates in one repository.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#080808] border border-indigo-500/25 shadow-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Real-Time Synchronized Docket
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                    Instant live notifications and state transitions whenever an adviser endorses or a panel releases a verdict.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 03: PLATFORM (SIX INTERCONNECTED STAKEHOLDERS)
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 2 && (
            <motion.section
              key="slide-platform"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-6xl mx-auto space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                    02 · Platform Architecture — Six Institutional Roles
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                    One platform. Every academic stakeholder.
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 dark:text-[#929292] max-w-xs">
                  Strict academic separation of duties across all six university defense roles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ECOSYSTEM_ROLES.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.id}
                      className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-4 transition-all hover:border-blue-500/40 hover:shadow-md"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="h-9 w-9 rounded-xl bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-center">
                            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-[#929292]">
                            {role.subtitle}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F5]">
                          {role.title}
                        </h3>

                        <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                          {role.desc}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-200/80 dark:border-[#1F1F1F]">
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold block truncate">
                          {role.metrics}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 04: ACADEMIC WORKFLOW (5 STAGES & CORE CAPABILITIES)
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 3 && (
            <motion.section
              key="slide-workflow"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-6xl mx-auto space-y-6"
            >
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                  03 · Academic Defense Lifecycle &amp; Core Capabilities
                </p>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                  From initial concept proposal to final verdict.
                </h2>
              </div>

              {/* 5-Stage Progression Timeline */}
              <div className="relative">
                <div className="hidden lg:block absolute top-7 left-6 right-6 h-px bg-zinc-200 dark:bg-[#252525] -z-0" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                  {DEFENSE_STAGES.map((stg) => (
                    <div
                      key={stg.step}
                      className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-7 w-7 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {stg.step}
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400 dark:text-[#929292] uppercase">
                            Stage {stg.step}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                          {stg.name}
                        </h3>
                        <p className="text-[11px] text-zinc-600 dark:text-[#929292] leading-relaxed">
                          {stg.desc}
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-zinc-100 dark:border-[#1F1F1F]">
                        <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 block truncate">
                          {stg.deliverable}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 Core Capabilities Compact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {CORE_CAPABILITIES.map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <div
                      key={cap.num}
                      className="p-4 rounded-xl bg-zinc-50/80 dark:bg-[#080808] border border-zinc-200 dark:border-[#252525] flex items-start gap-3.5"
                    >
                      <div className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#252525] text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F5] truncate">
                            {cap.title}
                          </h4>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                            {cap.badgeText}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-[#929292] leading-snug">
                          {cap.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 05: FLAGSHIP SPLIT-SCREEN WORKSPACE PREVIEW
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 4 && (
            <motion.section
              key="slide-workspace"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-6xl mx-auto space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                    04 · The Signature Experience — Split-Screen Workspace
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                    Review manuscripts and grade rubrics side by side.
                  </h2>
                </div>

                {/* Interactive Mode Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      manualWorkspaceOverrideRef.current = true;
                      setActiveWorkspaceView("split");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeWorkspaceView === "split"
                        ? "bg-zinc-900 text-white dark:bg-[#F5F5F5] dark:text-[#050505] shadow-xs"
                        : "bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292] border border-zinc-200 dark:border-[#252525]"
                    }`}
                  >
                    1. Split-Screen Review &amp; Endorsement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      manualWorkspaceOverrideRef.current = true;
                      setActiveWorkspaceView("grading");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeWorkspaceView === "grading"
                        ? "bg-zinc-900 text-white dark:bg-[#F5F5F5] dark:text-[#050505] shadow-xs"
                        : "bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292] border border-zinc-200 dark:border-[#252525]"
                    }`}
                  >
                    2. 100-Point Rubric Grading
                  </button>
                </div>
              </div>

              {/* Vector Digital Interface Mockup */}
              <div className="relative rounded-2xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#050505] overflow-hidden shadow-xl">
                {/* Browser Top Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-[#252525] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-zinc-500 dark:text-[#929292] hidden sm:inline-block">
                      aurora.parsu.edu.ph/workspace/BSIT-2026-FINAL
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Defense Session · RA 8792 Secured
                    </span>
                  </div>
                </div>

                {/* Split Screen Workspace Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* Left Pane: Manuscript PDF Viewer (7 cols) */}
                  <div className="lg:col-span-7 p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#070707]">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#1F1F1F] text-[11px] font-mono text-zinc-500 dark:text-[#929292]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 shrink-0" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          PARSU-DCS-2026-FINAL-MANUSCRIPT.pdf
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-zinc-100 dark:bg-[#141414] px-2 py-0.5 rounded text-[10px]">
                          Page 14 / 82
                        </span>
                        <span className="bg-zinc-100 dark:bg-[#141414] px-2 py-0.5 rounded text-[10px]">
                          Ribbon Active
                        </span>
                      </div>
                    </div>

                    <div className="my-3.5 p-5 rounded-xl bg-zinc-50 dark:bg-[#0D0D0D] border border-zinc-200 dark:border-[#1F1F1F] space-y-3">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        AURORA: Paperless Academic Defense Workflow System for Research, Capstone, Thesis &amp; Dissertation Papers
                      </h4>

                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <div className="flex items-center justify-between text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold mb-1">
                          <span>§ 3.4 Automated Score Computation &amp; Threshold Verdict</span>
                          <span className="bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.2 rounded text-[9px]">
                            Annotation #1
                          </span>
                        </div>
                        &ldquo;The evaluation engine calculates weighted composite ratings across all panel members in real time, determining Pass or Fail strictly from the passing threshold...&rdquo;
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-blue-500/30 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                              KC
                            </div>
                            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                              Dr. Kennedy C. Cuya · Panel Chair
                            </span>
                          </div>
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Resolved in Rev 2
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300 pl-7">
                          Statistical consensus formula verified against the 2026 ParSU evaluation guidelines.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-[#929292]">
                      <span>SHA-256: 7f9b8c2e...3d1a4e5f</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        Unified Download Dropdown (Original + Annotated PDF)
                      </span>
                    </div>
                  </div>

                  {/* Right Pane: Dynamic Mode Switcher (5 cols) */}
                  <div className="lg:col-span-5 p-5 flex flex-col justify-between bg-zinc-50/70 dark:bg-[#0A0A0A]">
                    <AnimatePresence mode="wait">
                      {activeWorkspaceView === "split" ? (
                        <motion.div
                          key="mock-split"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4"
                        >
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                              Stage 05 Milestone · Real-Time Gate
                            </span>
                            <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                              Adviser Endorsement &amp; Panel Docket
                            </h4>
                          </div>

                          <div className="p-3.5 rounded-xl bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] space-y-2 text-xs">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              Adviser Readiness Checkpoints
                            </p>
                            <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-[#1F1F1F] text-zinc-600 dark:text-zinc-400">
                              <span>Chapters 1–5 Inline Revisions</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                14 / 14 Addressed
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1 text-zinc-600 dark:text-zinc-400">
                              <span>Endorsement Status</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Endorsed for Defense
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-[#929292]">
                              Assigned Defense Committee
                            </p>
                            <div className="p-2 rounded-lg bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-between text-xs">
                              <span className="font-semibold">Dr. Kennedy C. Cuya</span>
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                                Panel Chair
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white dark:bg-[#050505] border border-zinc-200 dark:border-[#252525] flex items-center justify-between text-xs">
                              <span className="font-semibold">Michael B. Amata</span>
                              <span className="text-[10px] font-mono text-zinc-500">Panel Member</span>
                            </div>
                          </div>

                          <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                            <Check className="h-4 w-4" />
                            <span>Adviser Endorsement Synced Live</span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="mock-grading"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4"
                        >
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                              Threshold-Driven Evaluation · 75% Passing
                            </span>
                            <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                              100-Point Weighted Rubric Sliders
                            </h4>
                          </div>

                          <div className="space-y-2.5 text-xs">
                            {[
                              { label: "1. Problem Formulation & Scope (25%)", val: "95%", score: "95 / 100" },
                              { label: "2. Research & Software Rigor (35%)", val: "98%", score: "98 / 100" },
                              { label: "3. ISO 25010 Quality Model (25%)", val: "92%", score: "92 / 100" },
                              { label: "4. Oral Defense Response (15%)", val: "96%", score: "96 / 100" },
                            ].map((item) => (
                              <div key={item.label} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {item.label}
                                  </span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {item.score}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-[#252525] overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: item.val }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="p-3.5 rounded-xl bg-white dark:bg-[#050505] border border-emerald-500/30 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase">
                                Automatic Threshold Verdict
                              </p>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                95.5% (≥ 75%)
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/20">
                              PASSED
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ───────────────────────────────────────────────────────────────────
              SLIDE 06: ABOUT PARSU & FINAL CALL TO ACTION
          ─────────────────────────────────────────────────────────────────── */}
          {currentSlide === 5 && (
            <motion.section
              key="slide-about"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full max-w-6xl mx-auto space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                    05 · Institutional Coverage — Partido State University
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-[#F5F5F5] font-display">
                    One university. Five colleges. One paperless standard.
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/verify"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#252525] bg-zinc-50 dark:bg-[#0A0A0A] hover:bg-zinc-100 dark:hover:bg-[#141414] text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all"
                  >
                    Verify Certificate
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md group"
                  >
                    <span>Enter AURORA Portal</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* 5 Constituent Colleges + ParSU Goa Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COLLEGES.map((col) => (
                  <div
                    key={col.code}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                          {col.code}
                        </span>
                        <span className="text-[10px] uppercase font-mono text-zinc-500 dark:text-[#929292]">
                          Goa Campus
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-[#F5F5F5]">
                        {col.name}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-[#929292] leading-relaxed">
                        {col.desc}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 dark:border-[#1F1F1F]">
                      <p className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium truncate">
                        {col.programs.join(" • ")}
                      </p>
                    </div>
                  </div>
                ))}

                {/* ParSU Goa Official Summary Card */}
                <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-[#111111] border border-zinc-800 dark:border-blue-500/30 flex flex-col justify-between space-y-4 shadow-md">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-400">
                        PARSU · GOA CAMPUS
                      </span>
                      <Image
                        src="/aurora-symbol-transparent.png"
                        alt="AURORA Symbol"
                        width={22}
                        height={22}
                        className="object-contain brightness-100"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {INSTITUTION}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      San Juan Bautista, Goa, Camarines Sur. Official paperless research docket, rubric evaluation, and QR-verifiable clearance portal.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400">
                      &copy; {new Date().getFullYear()} {APP_FULL_NAME}
                    </span>
                    <Link
                      href="/login"
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                    >
                      <span>Launch</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* =========================================================================
          BOTTOM GLASS SLIDE CONTROL DOCK (Auto-Progress Pill + Play/Pause + Arrows)
      ========================================================================= */}
      <footer className="relative z-40 pb-4 pt-2 px-6 flex items-center justify-center shrink-0">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md border border-zinc-200 dark:border-[#252525] shadow-lg">
          {/* Play / Pause Auto-Slide Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            className="h-7 w-7 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#252525] text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            title={isAutoPlaying ? "Pause automatic sliding" : "Resume automatic sliding"}
            aria-label={isAutoPlaying ? "Pause automatic sliding" : "Resume automatic sliding"}
          >
            {isAutoPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3 ml-0.5" />
            )}
          </button>

          {/* Slide Counter + Label */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono pr-1">
            <span className="font-bold text-zinc-900 dark:text-white">
              0{currentSlide + 1}
            </span>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-500">0{SLIDES.length}</span>
            <span className="text-zinc-300 dark:text-zinc-700 mx-1">·</span>
            <span className="font-sans font-semibold text-zinc-700 dark:text-zinc-300 min-w-[110px]">
              {SLIDES[currentSlide].label}
            </span>
          </div>

          {/* Interactive Slide Progress Dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, idx) => {
              const isActive = currentSlide === idx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${s.label}`}
                  title={s.label}
                  className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "w-10 bg-zinc-200 dark:bg-[#252525]"
                      : "w-2 bg-zinc-300 dark:bg-[#303030] hover:bg-zinc-400 dark:hover:bg-[#454545]"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute inset-y-0 left-0 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-75"
                      style={{ width: `${isAutoPlaying ? progress : 100}%` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Prev / Next Slide Buttons */}
          <div className="flex items-center gap-1 pl-1 border-l border-zinc-200 dark:border-[#252525]">
            <button
              type="button"
              onClick={handlePrev}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-[#1A1A1A] text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Previous Slide (←)"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-[#1A1A1A] text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Next Slide (→)"
              aria-label="Next Slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
