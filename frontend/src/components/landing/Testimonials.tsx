import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const faqs = [
  {
    q: "Does DataSense give mathematically correct answers?",
    a: "Yes — 100% of the time for all 13 supported query types. Unlike pure LLM tools that guess numbers, DataSense routes every calculation through a deterministic Pandas engine. The LLM only translates your question into a structured operation; Python executes the actual math. This was validated across 60 queries on 6 public datasets against PostgreSQL ground truth.",
    badge: "Accuracy",
    color: "cyan",
  },
  {
    q: "How is DataSense different from ChatGPT or PandasAI?",
    a: "ChatGPT and PandasAI are probabilistic — they generate code or numbers that can be silently wrong. DataSense uses an architectural fix: the LLM never performs arithmetic. It produces a JSON operation spec like {\"operation\": \"group_agg\", \"group_by\": \"region\"} which a Pandas engine executes deterministically. Competing tools like LIDA scored 63.3% and Chat2VIS scored 58.3% on the same benchmark where DataSense scored 100%.",
    badge: "vs Competitors",
    color: "blue",
  },
  {
    q: "Is my data safe? Does it get sent to the cloud?",
    a: "Your raw data rows never leave your machine. DataSense enforces a strict 'Schema-Only Transmission' policy — only column names, types, and up to 5 sample values are sent to external APIs. A typical 10,000-row dataset compresses from ~200,000 tokens to ~800 tokens (a 250:1 ratio), which also makes it dramatically cheaper to run. This design is aligned with GDPR Article 5(1)(c) data minimization principles.",
    badge: "Privacy",
    color: "green",
  },
  {
    q: "What file formats and chart types are supported?",
    a: "DataSense ingests CSV, XLSX, JSON, and PDF files. For PDFs it also builds an interactive knowledge graph using D3.js force simulation. On the visualization side, 13 Plotly chart types are auto-configured from your schema: bar, line, area, pie, scatter, histogram, box, violin, heatmap, treemap, sunburst, funnel, and waterfall — with large-dataset safety policies built into each.",
    badge: "Capabilities",
    color: "purple",
  },
  {
    q: "How fast does DataSense respond?",
    a: "The median end-to-end analytical response time is 2.1 seconds, well within Nielsen's 3-second interactive perception threshold. The Pandas execution step itself takes only 40ms — the rest is LLM inference. Visualization queries complete in 1.8 seconds at the median. This was measured on an Apple M2 Pro with Llama 3 8B running locally via Ollama.",
    badge: "Performance",
    color: "amber",
  },
  {
    q: "What AI models power DataSense?",
    a: "DataSense uses a dual-LLM architecture. Google Gemini 2.5 Flash handles upload-time tasks — schema analysis and chart configuration — where quality matters most. Meta Llama 3 (8B, 4-bit quantized) runs locally via Ollama for all chat-time query planning and narration, keeping latency low and cost at zero per query after setup. Five specialized agents coordinate across both models.",
    badge: "Architecture",
    color: "rose",
  },
];

const colorMap: Record<string, { badge: string; border: string; icon: string; bar: string }> = {
  cyan:   { badge: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",   border: "border-cyan-400/30",   icon: "text-cyan-400",   bar: "bg-cyan-400" },
  blue:   { badge: "text-blue-300 bg-blue-400/10 border-blue-400/20",   border: "border-blue-400/30",   icon: "text-blue-400",   bar: "bg-blue-400" },
  green:  { badge: "text-green-300 bg-green-400/10 border-green-400/20", border: "border-green-400/30", icon: "text-green-400",  bar: "bg-green-400" },
  purple: { badge: "text-purple-300 bg-purple-400/10 border-purple-400/20", border: "border-purple-400/30", icon: "text-purple-400", bar: "bg-purple-400" },
  amber:  { badge: "text-amber-300 bg-amber-400/10 border-amber-400/20", border: "border-amber-400/30", icon: "text-amber-400",  bar: "bg-amber-400" },
  rose:   { badge: "text-rose-300 bg-rose-400/10 border-rose-400/20",   border: "border-rose-400/30",   icon: "text-rose-400",   bar: "bg-rose-400" },
};

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="testimonials" className="relative py-24 px-6 max-w-4xl mx-auto">

      {/* Background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none flex justify-center">
        <div className="w-[500px] h-[500px] bg-indigo-500/8 blur-[120px] rounded-full mt-20" />
      </div>

      {/* Heading */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-xs rounded-full border border-indigo-400/25 text-indigo-300 bg-indigo-400/8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          From the research paper
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Questions &{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Answers
          </span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          Everything you need to know about how DataSense works — backed by
          benchmarks, not marketing.
        </p>
      </motion.div>

      {/* FAQ accordion */}
      <div className="flex flex-col gap-3">
        {faqs.map((faq, i) => {
          const c = colorMap[faq.color];
          const isOpen = open === i;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? `border-white/15 bg-white/5`
                    : "border-white/8 bg-[#080d18] hover:border-white/12 hover:bg-white/3"
                }`}
              >
                {/* Question row — clickable */}
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Colour bar */}
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${c.bar} opacity-70`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                          {faq.badge}
                        </span>
                      </div>
                      <span className="text-sm md:text-base font-semibold text-white leading-snug">
                        {faq.q}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-shrink-0 w-7 h-7 rounded-full border border-white/10 flex items-center justify-center transition-colors ${
                      isOpen ? "bg-white/10" : "bg-white/4"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0">
                        <div className="ml-4 pl-4 border-l border-white/8">
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

     
    </section>
  );
}