import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";



const TYPED_QUERIES = [
  "Show me a chart of revenue by region",
  "What is the average order value?",
  "Find top 5 customers by sales",
  "Show revenue trends for last 6 months",
];

export default function Demo() {
  const [typedText, setTypedText] = useState("");
  const [queryIndex, setQueryIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = TYPED_QUERIES[queryIndex];

    if (!isDeleting && charIndex < current.length) {
      timeoutRef.current = setTimeout(() => {
        setTypedText(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 55);
    } else if (!isDeleting && charIndex === current.length) {
      timeoutRef.current = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && charIndex > 0) {
      timeoutRef.current = setTimeout(() => {
        setTypedText(current.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, 28);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setQueryIndex((i) => (i + 1) % TYPED_QUERIES.length);
    }

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [charIndex, isDeleting, queryIndex]);

  return (
    <section
      id="demo"
      className="relative py-24 px-4 max-w-7xl mx-auto"
    >
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 flex justify-center items-center pointer-events-none">
        <div className="w-[700px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full" />
      </div>

      {/* Heading */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
      >
        <p className="text-xs tracking-[0.2em] uppercase text-cyan-400/70 mb-3 font-medium">
          Live Demo
        </p>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Ask, Explore, Visualise.
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
          Your time is too valuable to look up column names.
          Focus on the questions — DataSense handles the rest, instantly.
        </p>
      </motion.div>

    
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl"
        style={{ background: "#111827" }}
      >
        {/* ── Top chrome bar ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b border-white/8"
          style={{ background: "#0d1117" }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div
              className="px-4 py-1 rounded-md text-xs text-slate-500 border border-white/8"
              style={{ background: "#161b22" }}
            >
              datasense.ai/dashboard
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-500">Connected</span>
          </div>
        </div>

        {/* ── Body: iframe (animated demo) fills top ── */}
        <div className="w-full" style={{ height: "500px", background: "#0d0f14" }}>
          <iframe
            src="/datasense_animated_demo.html"
            className="w-full h-full"
            style={{ border: "none", pointerEvents: "none", display: "block" }}
            title="DataSense Animated Demo"
          />
        </div>

      
        
        
        
      </motion.div>
    </section>
  );
}