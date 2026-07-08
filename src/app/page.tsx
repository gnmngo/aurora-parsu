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

const features = [
  {
    icon: FileText,
    title: "Split-Screen Workspace",
    description: "Read the manuscript PDF while grading or adding annotations side-by-side in a single, high-fidelity responsive workspace.",
  },
  {
    icon: MessageSquare,
    title: "Anchored Annotations",
    description: "Point-and-click coordinate highlighting with threaded comments, severity labels (major/critical), and compliance verification.",
  },
  {
    icon: BarChart3,
    title: "Consensus Analytics",
    description: "Live dashboard tracking score deviations, median averages, consensus levels, and auto-computed grading verdicts.",
  },
  {
    icon: Shield,
    title: "Cryptographic Verification",
    description: "Immutable audit trails tracking all workflow events with verified electronic signatures and public certificate checkers.",
  },
];

const faqs = [
  {
    q: "How does the Adviser Approval Gate work?",
    a: "Before any manuscript can be scheduled for a defense, the research adviser must review and sign off on the draft. If rejected, it returns to the student for modifications.",
  },
  {
    q: "Are the grading rubrics database-driven?",
    a: "Yes. Coordinators can design custom grading rubrics dynamically. Different academic programs (e.g. BSIT vs. BSEd) can enforce completely different rubric sets.",
  },
  {
    q: "What is the consensus validation model?",
    a: "If the standard deviation of scores submitted by panelists exceeds a predefined threshold (e.g., 15 points), the system triggers a discrepancy alert for arbitration.",
  },
];

const roles = [
  { title: "Student", desc: "Upload manuscripts, track defense schedules, and view feedback." },
  { title: "Adviser", desc: "Approve manuscripts before scheduling, mentor students." },
  { title: "Panelist", desc: "Evaluate defenses using rubrics and annotate PDFs." },
  { title: "Coordinator", desc: "Manage workflow templates, schedule defenses, resolve conflicts." }
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
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-md"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </motion.div>
            <span className="font-extrabold tracking-wider text-foreground text-base font-display">AURORA</span>
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
          className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1] text-foreground font-display"
        >
          The Paperless Academic
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Defense Workflow System
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground font-medium leading-relaxed"
        >
          {APP_FULL_NAME}. A high-performance, RBAC-hardened campus engine validating manuscript timelines, advisor gates, and signed panel evaluations.
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
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Dynamic Defense Workflow</h2>
            <p className="text-sm text-muted-foreground font-medium">Strict database-driven progression stages from proposal to archiving</p>
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
              { num: "01", step: "Manuscript Submit", desc: "Students upload PDF manuscript and select adviser." },
              { num: "02", step: "Adviser Gate", desc: "Research adviser reviews and signs approval to schedule." },
              { num: "03", step: "Panel Evaluation", desc: "Panelists review in split-screen and submit score rubrics." },
              { num: "04", step: "Consensus Verdict", desc: "Coordinators run discrepancy audits and verify signatures." },
              { num: "05", step: "Certificate Issue", desc: "Cryptographically hashed PDF certificates issued to students." }
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
            <p className="text-sm text-muted-foreground font-medium">Four distinct permission levels driving the ecosystem</p>
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
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-foreground font-black font-display tracking-widest">AURORA PLATFORM</span>
          </div>
          <span>© {new Date().getFullYear()} {INSTITUTION}. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
