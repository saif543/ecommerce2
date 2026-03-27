"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function PromoBanner() {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111111 0%, #1a1714 40%, #111111 100%)" }}>
      {/* Decorative glows */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#f26e21]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#ff8c42]/8 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6 py-10 min-[480px]:py-12 min-[768px]:py-16 relative">
        <div className="flex flex-col min-[768px]:flex-row items-center justify-between gap-6 min-[768px]:gap-10">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-center min-[768px]:text-left max-w-lg"
          >
            <div className="inline-flex items-center gap-1.5 bg-[#f26e21]/15 rounded-full px-3 py-1 mb-3 min-[480px]:mb-4">
              <Sparkles size={12} className="text-[#f26e21]" />
              <span className="text-[#f26e21] text-[10px] min-[480px]:text-xs font-semibold uppercase tracking-wider">Limited Time</span>
            </div>
            <h2 className="text-xl min-[480px]:text-2xl min-[768px]:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2 min-[480px]:mb-3">
              Upgrade Your Tech <br className="hidden min-[480px]:block" />
              <span className="text-[#f26e21]">Save Up to 40%</span>
            </h2>
            <p className="text-white/40 text-xs min-[480px]:text-sm max-w-sm mx-auto min-[768px]:mx-0">
              Premium gadgets and accessories at unbeatable prices. Don't miss out on this week's exclusive deals.
            </p>
          </motion.div>

          {/* Right CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col min-[480px]:flex-row items-center gap-3"
          >
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 px-6 py-3 min-[768px]:px-8 min-[768px]:py-3.5 bg-[#f26e21] text-white text-sm min-[768px]:text-base font-semibold rounded-full hover:bg-[#ff8c42] transition-all duration-300 shadow-[0_4px_20px_rgba(242,110,33,0.4)]"
            >
              Shop Now
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              href="/trending"
              className="inline-flex items-center gap-2 px-6 py-3 min-[768px]:px-8 min-[768px]:py-3.5 border border-white/20 text-white text-sm min-[768px]:text-base font-semibold rounded-full hover:bg-white/10 transition-all duration-300"
            >
              View Trending
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
