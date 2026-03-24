"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="bg-white py-10 min-[768px]:py-16">
      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6 min-[768px]:mb-10"
        >
          <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-text-primary mb-2">
            Watch & Explore
          </h2>
          <p className="text-text-secondary text-xs min-[480px]:text-sm">
            See our products in action
          </p>
        </motion.div>

        {/* Video Thumbnail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => setPlaying(true)}
        >
          {/* Thumbnail with gradient overlay */}
          <div className="relative aspect-video bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#222222] overflow-hidden">
            {/* Demo thumbnail image */}
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=675&fit=crop"
              alt="Video thumbnail"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/80 via-transparent to-[#111111]/30" />

            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 min-[480px]:w-20 min-[480px]:h-20 min-[768px]:w-24 min-[768px]:h-24 rounded-full bg-[#f26e21]/80 backdrop-blur-sm border-2 border-[#f26e21] flex items-center justify-center group-hover:bg-[#f26e21] transition-all"
              >
                <Play size={28} className="text-white ml-1 min-[480px]:w-8 min-[480px]:h-8 min-[768px]:w-10 min-[768px]:h-10" fill="white" />
              </motion.div>
            </div>

            {/* Bottom text */}
            <div className="absolute bottom-0 left-0 right-0 p-4 min-[480px]:p-6">
              <p className="text-white font-bold text-sm min-[480px]:text-base min-[768px]:text-lg">
                ZenTech — Premium Tech, Delivered
              </p>
              <p className="text-white/60 text-xs min-[480px]:text-sm mt-1">
                Discover what makes us different
              </p>
            </div>
          </div>
        </motion.div>

        {/* Video Modal */}
        <AnimatePresence>
          {playing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setPlaying(false)}
            >
              {/* Close button */}
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 min-[480px]:top-6 min-[480px]:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <X size={22} className="text-white" />
              </button>

              {/* Video Player */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                  title="ZenTech Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
