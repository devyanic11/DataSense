import {Button} from "../../ui/button";
import { motion } from "framer-motion";

type HeroProps = {
  onGetStarted?: () => void;
};

const stats = [
  { value: "100%", label: "Arithmetic accuracy" },
  { value: "2.1s", label: "Median response time" },
  { value: "13+", label: "Chart types" },
  { value: "99%", label: "Token cost reduction" },
];

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
    title: "Upload any format",
    desc: "CSV, XLSX, JSON, PDF — parsed instantly",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
    title: "13 chart types",
    desc: "Auto-configured from your schema",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Zero hallucinations",
    desc: "Pandas executes all math deterministically",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "Schema-only privacy",
    desc: "Raw data never leaves your machine",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    title: "Plain English queries",
    desc: "No SQL, no code, no setup needed",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    title: "Dual LLM engine",
    desc: "Gemini 2.5 Flash + Llama 3 locally",
  },
];

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-8 px-6 max-w-6xl mx-auto text-center overflow-hidden">

      {/* ── Spotlight grid background ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Central spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full" />
        {/* Secondary glow — indigo bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/8 blur-[100px] rounded-full" />
        {/* Edge accents */}
        <div className="absolute top-40 -left-20 w-[300px] h-[300px] bg-blue-500/6 blur-[80px] rounded-full" />
        <div className="absolute top-40 -right-20 w-[300px] h-[300px] bg-purple-500/6 blur-[80px] rounded-full" />
        {/* Radial vignette over grid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, #050810 100%)",
          }}
        />
      </div>

      {/* ── Badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 text-xs rounded-full border border-cyan-400/25 text-cyan-400 bg-cyan-400/8 backdrop-blur-sm"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        AI-Powered Business Intelligence 
      </motion.div>

      {/* ── Main heading ── */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6"
      >
     <span className="text-white">Data Intelligence,</span>
<br />
<span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
  Without the Complexity.
</span>
      </motion.h1>

      {/* ── Sub-heading ── */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
      >
        Upload any file, type a question in plain English, and get{" "}
        <span className="text-slate-200 font-medium">
          mathematically guaranteed
        </span>{" "}
        insights — no hallucinations, no code, no setup.
      </motion.p>

      {/* ── CTA buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap gap-4 justify-center mb-16"
      >
        <Button
          onClick={onGetStarted}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 shadow-lg shadow-cyan-500/25 px-8 py-3 text-white font-semibold rounded-xl text-base transition-all"
        >
          Get Started Free
        </Button>
        <Button
          variant="outline"
          className="border-white/15 text-white hover:bg-white/8 backdrop-blur-md px-8 py-3 rounded-xl text-base transition-all"
          onClick={() =>
            document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Watch Demo
        </Button>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-wrap justify-center gap-8 mb-8"
      >
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {s.value}
            </span>
            <span className="text-xs text-slate-500 mt-1">{s.label}</span>
          </div>
        ))}
      </motion.div>

    
    </section>
  );
}