import { motion } from "framer-motion";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    badge: "NL Interface",
    title: "Ask Your Data Anything",
    desc: "Query your dataset using plain English. No SQL, no formulas — just type your question and get precise answers instantly.",
    stat: "95%",
    statLabel: "query accuracy",
    color: "cyan",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    badge: "Deterministic",
    title: "Zero Hallucination Analytics",
    desc: "Every number is computed by a Pandas engine — not guessed by an LLM. Arithmetic is always 100% exact, matching SQL-level precision.",
    stat: "100%",
    statLabel: "arithmetic correctness",
    color: "green",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
    badge: "Auto Dashboard",
    title: "Instant Visual Insights",
    desc: "13 Plotly chart types configured automatically from your schema — bar, line, scatter, treemap, heatmap, violin, and more.",
    stat: "13+",
    statLabel: "chart types",
    color: "blue",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    badge: "Multi-Agent",
    title: "5-Agent AI Pipeline",
    desc: "Gemini 2.5 Flash handles schema analysis at upload. Llama 3 via Ollama manages low-latency chat queries locally — best of both worlds.",
    stat: "2.1s",
    statLabel: "median response",
    color: "purple",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5-3.75c.621 0 1.125.504 1.125 1.125v6c0 .621-.504 1.125-1.125 1.125" />
      </svg>
    ),
    badge: "Multi-Format",
    title: "Handles Real-World Data",
    desc: "Ingest CSV, XLSX, JSON, and PDF files. Large-dataset safety policies cap samples for charts while computing aggregations on the full dataset.",
    stat: "4",
    statLabel: "file formats",
    color: "amber",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    badge: "Privacy First",
    title: "Schema-Only Transmission",
    desc: "Raw data rows never reach any external API. Only column metadata is sent — a 250:1 token compression that's also GDPR-aligned by design.",
    stat: "99%",
    statLabel: "token reduction",
    color: "rose",
  },
];

const colorMap: Record<string, { border: string; bg: string; icon: string; badge: string; badgeBg: string; stat: string; glow: string }> = {
  cyan:   { border: "hover:border-cyan-400/40",   bg: "from-cyan-500/8 to-cyan-500/0",    icon: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",   badge: "text-cyan-300 bg-cyan-400/10",   badgeBg: "", stat: "text-cyan-300",   glow: "bg-cyan-400/6" },
  green:  { border: "hover:border-green-400/40",  bg: "from-green-500/8 to-green-500/0",  icon: "text-green-400 bg-green-400/10 border-green-400/20", badge: "text-green-300 bg-green-400/10", badgeBg: "", stat: "text-green-300", glow: "bg-green-400/6" },
  blue:   { border: "hover:border-blue-400/40",   bg: "from-blue-500/8 to-blue-500/0",    icon: "text-blue-400 bg-blue-400/10 border-blue-400/20",   badge: "text-blue-300 bg-blue-400/10",   badgeBg: "", stat: "text-blue-300",  glow: "bg-blue-400/6"  },
  purple: { border: "hover:border-purple-400/40", bg: "from-purple-500/8 to-purple-500/0",icon: "text-purple-400 bg-purple-400/10 border-purple-400/20",badge:"text-purple-300 bg-purple-400/10",badgeBg:"",stat:"text-purple-300",glow:"bg-purple-400/6"},
  amber:  { border: "hover:border-amber-400/40",  bg: "from-amber-500/8 to-amber-500/0",  icon: "text-amber-400 bg-amber-400/10 border-amber-400/20", badge: "text-amber-300 bg-amber-400/10", badgeBg: "", stat: "text-amber-300", glow: "bg-amber-400/6" },
  rose:   { border: "hover:border-rose-400/40",   bg: "from-rose-500/8 to-rose-500/0",    icon: "text-rose-400 bg-rose-400/10 border-rose-400/20",   badge: "text-rose-300 bg-rose-400/10",   badgeBg: "", stat: "text-rose-300",  glow: "bg-rose-400/6"  },
};

export default function Features() {
  return (
    <section id="features" className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto">

      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/6 blur-[120px] rounded-full" />
      </div>

      {/* Heading */}
      <motion.div
        className="text-center mb-20"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-xs rounded-full border border-indigo-400/25 text-indigo-300 bg-indigo-400/8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          What makes DataSense different
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
          Powerful Features for{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Smarter Decisions
          </span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
          DataSense combines AI intelligence with deterministic computation to
          deliver insights you can actually trust — no setup, no expertise required.
        </p>
      </motion.div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => {
          const c = colorMap[f.color];
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: "easeOut" }}
              className={`group relative rounded-2xl p-6 border border-white/8 bg-[#080d18] overflow-hidden transition-all duration-300 ${c.border}`}
            >
              {/* Hover gradient fill */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${c.bg} pointer-events-none`} />

              {/* Top glow spot */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${c.glow} pointer-events-none`} />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon + badge row */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${c.icon}`}>
                    {f.icon}
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                    {f.badge}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-2 leading-snug group-hover:text-white transition">
                  {f.title}
                </h3>

                {/* Desc */}
                <p className="text-sm text-slate-500 leading-relaxed mb-5 group-hover:text-slate-400 transition-colors duration-300">
                  {f.desc}
                </p>

                {/* Stat pill at bottom */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/6">
                  <span className={`text-xl font-extrabold tracking-tight ${c.stat}`}>
                    {f.stat}
                  </span>
                  <span className="text-xs text-slate-600">{f.statLabel}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}