"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  ArrowRight,
  Sparkles,
  Award,
  Calendar,
  Users,
  Sun,
  Moon,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  FileCheck,
  ChevronDown
} from "lucide-react";
import { APP_FULL_NAME, APP_NAME, INSTITUTION } from "@/constants/app";
import { useTheme } from "@/providers/theme-provider";
import { AuroraLogo } from "@/components/ui/aurora-logo";

const features = [
  {
    icon: FileText,
    title: "Split-Screen Workspace",
    description: "Review manuscript PDFs on the left while scoring rubrics on the right in a responsive dual-pane interface with draggable split ratio and toggleable view modes.",
  },
  {
    icon: MessageSquare,
    title: "Google Docs-Style Highlighting",
    description: "Highlight any text span directly on the PDF to trigger a floating comment pill, leaving persistent yellow overlays with percentage-based coordinates and threaded replies.",
  },
  {
    icon: FileCheck,
    title: "Adviser Endorsement Gate",
    description: "Strict institutional separation of duties: Advisers conduct paperless consultations and hold the defense endorsement gate, strictly isolated from panelist grading.",
  },
  {
    icon: BarChart3,
    title: "Weighted Rubric Scoring",
    description: "Database-driven criterion rubrics (0-100) with custom weights, passing thresholds, consensus mean calculation, and discrepancy alerts (>15 pts).",
  },
  {
    icon: Shield,
    title: "Cryptographic E-Signatures",
    description: "Multi-mode digital signature canvas (Draw, Type, Upload) sealed with SHA-256 integrity hashes and locked permanently by PostgreSQL immutability triggers.",
  },
  {
    icon: Award,
    title: "Public Verification Portal",
    description: "Public accreditation portal (/verify) with instant SHA-256 cryptographic replay and scannable QR codes for CHED, ISO, and registrar compliance.",
  },
];

const faqs = [
  {
    q: "How does the Google Docs-style PDF highlighting work?",
    a: "Reviewers can highlight any text passage directly inside the manuscript PDF. A floating [+ Add comment] button appears at the selection edge. Saving creates a persistent yellow highlight overlay mapped to relative percentage coordinates, ensuring exact text alignment across all devices and zoom levels.",
  },
  {
    q: "What is the Adviser Consultation & Endorsement Gate?",
    a: "To preserve academic integrity, research advisers mentor students through paperless PDF annotations but are strictly barred from scoring rubrics for their advisees. The defense scheduler is locked until the adviser explicitly endorses the manuscript ('Endorse for Defense' vs 'Request Revisions').",
  },
  {
    q: "How are defense evaluations cryptographically secured?",
    a: "When a panelist submits their score sheet, they provide a digital e-signature (Draw, Type, or Upload). AURORA generates a deterministic SHA-256 payload hash, mints an official institutional serial (AURORA-YYYY-XXXXXX), and activates a PostgreSQL trigger (tr_evaluations_immutable) preventing any future edits.",
  },
  {
    q: "How do external accreditors (CHED / ISO) verify certificates?",
    a: "Anyone can navigate to the public verification portal (/verify) or scan the QR code printed on the official defense certificate. The system re-hashes the stored evaluation payload and displays a verifiable cryptographic audit certificate with evaluator signatures and timestamps.",
  },
];

const roles = [
  { 
    title: "Student / Author", 
    desc: "Uploads manuscript PDFs, views live yellow text highlights, submits threaded replies, marks feedback as 'Addressed', and downloads official certificates." 
  },
  { 
    title: "Research Adviser", 
    desc: "Mentors advisees paperlessly via PDF highlights. Holds the defense scheduling gate ('Endorse' vs 'Request Revisions'), with strict separation from panel grading." 
  },
  { 
    title: "Defense Panelist", 
    desc: "Evaluates manuscripts in the split-screen workspace, scores weighted criteria rubrics, enters panel remarks, and digitally signs the official evaluation." 
  },
  { 
    title: "Research Coordinator", 
    desc: "Configures college rubric templates, manages defense calendar schedules, assigns panel chairs and panelists, and audits score consensus deviations." 
  },
  { 
    title: "College Dean", 
    desc: "Monitors cross-departmental defense analytics, completion rates, and institutional compliance reports across all college academic programs." 
  },
  { 
    title: "System Administrator", 
    desc: "Manages user role assignments, institutional security policies, defense stage progression templates, and tamper-proof audit trail logs." 
  }
];

export default function HomePage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { scrollY } = useScroll();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const headerBg = useTransform(
    scrollY,
    [0, 100],
    ["rgba(var(--background), 0)", "rgba(var(--card), 0.8)"]
  );

  const headerBorder = useTransform(
    scrollY,
    [0, 100],
    ["rgba(var(--border), 0)", "rgba(var(--border), 1)"]
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200 antialiased font-sans flex flex-col overflow-hidden">
      {/* Dynamic Header */}
      <motion.header 
        style={{ backgroundColor: headerBg, borderColor: headerBorder }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-colors duration-200"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <AuroraLogo size="md" showText={true} textColor="text-foreground" />
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#workflow" className="hover:text-primary transition-colors">Workflow</a>
              <a href="#roles" className="hover:text-primary transition-colors">Roles</a>
              <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </nav>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.button>

            <Link href="/login">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                Portal Login
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-32 pb-20 text-center flex flex-col items-center space-y-8 min-h-screen justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm"
        >
          {INSTITUTION}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-foreground font-display"
        >
          Paperless Academic Defense
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Workflow System
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto max-w-3xl text-sm sm:text-base text-muted-foreground font-medium leading-relaxed"
        >
          A unified paperless workflow platform for <strong>Research, Capstone, Thesis &amp; Dissertation Papers</strong> at <strong>Partido State University</strong>. Streamlining manuscript submissions, adviser approval gates, rubrics-based grading, and cryptographically verified defense certifications.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 pt-4"
        >
          <Link href="/login">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 group"
            >
              Enter Portal Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>
          <Link href="/verify">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-sm font-bold hover:bg-muted transition-all duration-200"
            >
              Verify Certificates
            </motion.div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce"
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-md mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Platform Features</h2>
            <p className="text-sm text-muted-foreground font-medium">Advanced software design eliminating paperwork and administrative latency</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -5, borderColor: "hsl(var(--primary))" }}
                className="rounded-2xl border border-border bg-card p-6 transition-colors shadow-sm h-full flex flex-col"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-base tracking-tight mb-3">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium mt-auto">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Workflow Timeline */}
      <section id="workflow" className="py-24 border-y border-border bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-md mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Paperless Defense Workflow</h2>
            <p className="text-sm text-muted-foreground font-medium">Stage-by-stage progression from submission to institutional verification</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-6 md:grid-cols-5 relative"
          >
            <div className="absolute top-[28px] left-8 right-8 h-0.5 bg-border hidden md:block -z-10" />
            
            {[
              { num: "01", step: "Manuscript Submit", desc: "Students upload PDF manuscript; versioning tree tracks iterative drafts." },
              { num: "02", step: "Adviser Endorsement", desc: "Adviser annotates paperlessly and approves defense gate eligibility." },
              { num: "03", step: "Defense Scheduling", desc: "Coordinators assign panel chair, panelists, schedule date, time, and venue." },
              { num: "04", step: "Evaluation & Sign", desc: "Panelists score weighted rubrics, provide digital signature, and submit verdict." },
              { num: "05", step: "Public Verification", desc: "Postgres trigger locks record; minted serial verified via QR code and /verify." }
            ].map((s, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-lg">
                  {s.num}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-sm uppercase text-foreground">{s.step}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Roles Breakdown */}
      <section id="roles" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-md mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Role-Based Access</h2>
            <p className="text-sm text-muted-foreground font-medium">Six institutional roles enforcing academic separation of duties</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {roles.map((r, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="bg-card border border-border p-6 rounded-2xl shadow-sm flex gap-4 items-start"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">{r.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-background border-t border-border">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center max-w-md mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground font-medium">Answers regarding database compliance and security parameters</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-4"
          >
            {faqs.map((faq, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="bg-card border border-border p-6 rounded-2xl shadow-sm"
              >
                <h3 className="font-bold text-sm uppercase text-foreground flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed font-medium pl-8">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 mt-auto">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <AuroraLogo size="sm" showText={true} textColor="text-foreground" />
          </div>
          <span>© {new Date().getFullYear()} {INSTITUTION}. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
