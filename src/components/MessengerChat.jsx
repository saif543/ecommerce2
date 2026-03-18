"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function MessengerChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 min-[480px]:right-6 z-[999]">
      {/* Chat Bubble */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-[260px] min-[480px]:w-[280px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)" }}
            >
              <div className="w-9 h-9 rounded-full bg-[#DABE82]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#DABE82] font-bold text-sm">Z</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#DABE82] text-sm font-semibold">ZenTech</p>
                <p className="text-white/50 text-[10px]">Typically replies instantly</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-5">
              <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-text-primary text-sm leading-relaxed">How can I help you sir?</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-4 pb-4">
              <a
                href="https://www.messenger.com/t/61579377832787"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-[#DABE82] text-sm font-semibold py-2.5 rounded-xl transition-all hover:opacity-90 border border-[rgba(196,162,101,0.2)]"
                style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)" }}
              >
                Chat on Messenger
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(218,190,130,0.45),0_0_40px_rgba(218,190,130,0.2)] hover:shadow-[0_0_22px_rgba(218,190,130,0.6),0_0_50px_rgba(218,190,130,0.3)] transition-all border border-[rgba(218,190,130,0.35)]"
        style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)" }}
      >
        <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none"></span>
        {open ? (
          <X size={22} className="text-[#DABE82] relative" />
        ) : (
          <svg viewBox="0 0 24 24" fill="#DABE82" className="relative w-6 h-6 drop-shadow-[0_0_6px_rgba(218,190,130,0.6)]">
            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.36.27.58l.05 1.82c.02.56.6.93 1.11.7l2.04-.9c.17-.08.36-.1.55-.06.88.24 1.82.37 2.83.37 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.28 7.58-3.07 4.87c-.49.78-1.54.98-2.29.43l-2.44-1.83a.75.75 0 00-.9 0l-3.3 2.5c-.44.33-1.01-.17-.72-.64l3.07-4.87c.49-.78 1.54-.98 2.29-.43l2.44 1.83a.75.75 0 00.9 0l3.3-2.5c.44-.33 1.01.17.72.64z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
