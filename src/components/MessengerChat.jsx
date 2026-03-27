"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function MessengerChat() {
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem("zentech-chat-dismissed") === "1") setDismissed(true);
    } catch {}
  }, []);

  const dismissBubble = () => {
    setDismissed(true);
    setShowBubble(false);
    try { localStorage.setItem("zentech-chat-dismissed", "1"); } catch {}
  };

  // Pulsing message bubble — shows for 4s, hides for 6s, repeats
  useEffect(() => {
    if (open || dismissed) {
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
  }, [open, dismissed]);

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
            <div className="bg-white rounded-xl rounded-br-sm pl-4 pr-2 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center gap-2">
              <p className="text-text-primary text-sm font-medium">How can I help you? 👋</p>
              <button
                onClick={(e) => { e.stopPropagation(); dismissBubble(); }}
                className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X size={11} className="text-gray-400" />
              </button>
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
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_28px_rgba(0,0,0,0.35)] transition-all overflow-hidden bg-white border-2 border-[#f26e21]/30"
      >
        {open ? (
          <X size={24} className="text-[#f26e21]" />
        ) : (
          <img src="/customer-service.png" alt="Support" className="w-10 h-10 object-contain" />
        )}
      </motion.button>

      {/* Pulse ring animation */}
      {!open && (
        <span className="absolute inset-0 rounded-full animate-ping bg-[#f26e21]/20 pointer-events-none" />
      )}
    </div>
  );
}
