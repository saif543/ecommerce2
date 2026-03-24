"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function MessengerChat() {
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  // Pulsing message bubble — shows for 4s, hides for 6s, repeats
  useEffect(() => {
    if (open) {
      setShowBubble(false);
      return;
    }
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      setShowBubble(true);
      setTimeout(() => {
        if (!mounted) return;
        setShowBubble(false);
        setTimeout(() => { if (mounted) loop(); }, 6000);
      }, 4000);
    };
    // First show after 2s
    const initial = setTimeout(loop, 2000);
    return () => { mounted = false; clearTimeout(initial); };
  }, [open]);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 min-[480px]:right-6 z-[999]">
      {/* Chat Popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-[72px] right-0 w-[260px] min-[480px]:w-[280px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #111111 0%, #222222 100%)" }}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f26e21] to-[#ff8c42] flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(242,110,33,0.4)]">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">ZenTech Support</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-white/50 text-[10px]">Online now</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-5">
              <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-text-primary text-sm leading-relaxed">How can I help you sir? 😊</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-4 pb-4">
              <a
                href="https://www.messenger.com/t/61579377832787"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:opacity-90"
                style={{ background: "linear-gradient(180deg, #f26e21 0%, #e05e15 100%)" }}
              >
                Chat on Messenger
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble message */}
      <AnimatePresence>
        {showBubble && !open && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-[72px] right-0 whitespace-nowrap"
          >
            <div className="bg-white rounded-xl rounded-br-sm px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
              <p className="text-text-primary text-sm font-medium">How can I help you? 👋</p>
            </div>
            {/* Triangle pointer */}
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Icon Button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(242,110,33,0.4)] hover:shadow-[0_4px_28px_rgba(242,110,33,0.55)] transition-all overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f26e21 0%, #ff8c42 50%, #f26e21 100%)" }}
      >
        {/* Glossy highlight */}
        <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

        {open ? (
          <X size={24} className="text-white relative" />
        ) : (
          <svg viewBox="0 0 48 48" className="relative w-8 h-8" fill="none">
            {/* Head — larger, more adult proportion */}
            <circle cx="24" cy="15" r="8" fill="#F0C8A0" />
            {/* Hair — styled, mature */}
            <path d="M16 13c0-6 3.5-8.5 8-8.5s8 2.5 8 8.5c0 0-2-4-8-4s-8 4-8 4z" fill="#1a1a1a" />
            {/* Eyebrows */}
            <path d="M20 11.5h3" stroke="#333" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M25 11.5h3" stroke="#333" strokeWidth="0.8" strokeLinecap="round" />
            {/* Eyes */}
            <circle cx="21.5" cy="14" r="1" fill="#222" />
            <circle cx="26.5" cy="14" r="1" fill="#222" />
            {/* Nose */}
            <path d="M24 15.5v1.5" stroke="#D4A574" strokeWidth="0.7" strokeLinecap="round" />
            {/* Smile */}
            <path d="M22 18.5c0 0 1 1.2 2 1.2s2-1.2 2-1.2" stroke="#C4886E" strokeWidth="0.8" strokeLinecap="round" />
            {/* Neck */}
            <rect x="22" y="22.5" width="4" height="3" rx="1" fill="#F0C8A0" />
            {/* Body — suit with collar */}
            <path d="M12 46c0-9 5.5-20 12-20s12 11 12 20" fill="#111111" />
            {/* Collar / tie */}
            <path d="M22 26l2 4 2-4" fill="#f26e21" />
            <path d="M24 30v6" stroke="#f26e21" strokeWidth="1.2" />
            {/* Suit lapels */}
            <path d="M20 26c-2 2-4 6-4 10" stroke="#222" strokeWidth="0.6" />
            <path d="M28 26c2 2 4 6 4 10" stroke="#222" strokeWidth="0.6" />
            {/* Headset band */}
            <path d="M15.5 13a8.5 8.5 0 0 1 17 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
            {/* Ear cups */}
            <rect x="12.5" y="12" width="4" height="6" rx="2" fill="white" />
            <rect x="31.5" y="12" width="4" height="6" rx="2" fill="white" />
            {/* Mic arm */}
            <path d="M14.5 18c-1.5 0.5-2 2-2 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="12.5" cy="21.5" r="1.8" fill="white" />
          </svg>
        )}
      </motion.button>

      {/* Pulse ring animation */}
      {!open && (
        <span className="absolute inset-0 rounded-full animate-ping bg-[#f26e21]/20 pointer-events-none" />
      )}
    </div>
  );
}
