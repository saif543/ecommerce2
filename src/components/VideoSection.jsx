"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('?')[0];
    if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1].split('?')[0];
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function getThumbnail(videoId) {
  return videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=675&fit=crop";
}

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function VideoSection({ config = {} }) {
  const [[current, direction], setSlide] = useState([0, 1]);
  const [playing, setPlaying] = useState(false);
  const dragRef = useRef(false);

  const {
    title = 'Watch & Explore',
    subtitle = 'See our products in action',
  } = config;

  // Support both single video (youtubeUrl) and multiple (videos array)
  const videos = (() => {
    if (config.videos && config.videos.length > 0) return config.videos;
    if (config.youtubeUrl) return [{ youtubeUrl: config.youtubeUrl, label: title }];
    return [{ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'Watch & Explore' }];
  })();

  const total = videos.length;
  const multi = total > 1;

  const goTo = useCallback((index, dir) => {
    setSlide(([prev]) => {
      const d = dir ?? (index > prev ? 1 : -1);
      return [((index % total) + total) % total, d];
    });
  }, [total]);

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  const handleDragStart = () => {
    dragRef.current = true;
  };

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) next();
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) prev();
    // Keep flag true briefly so the click that fires after drag is ignored
    setTimeout(() => { dragRef.current = false; }, 300);
  };

  const video = videos[current];
  const videoId = extractYouTubeId(video.youtubeUrl);
  const thumbnailUrl = getThumbnail(videoId);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;

  const handleClick = () => {
    if (dragRef.current) return;
    if (embedUrl) setPlaying(true);
  };

  return (
    <section className="py-10 min-[768px]:py-16" style={{ background: "linear-gradient(180deg, #111111 0%, #1a1714 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6 min-[768px]:mb-10"
        >
          <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-white mb-2">
            {title}
          </h2>
          <div className="flex items-center justify-center gap-2 mb-2 min-[480px]:mb-3">
            <span className="h-[1.5px] w-8 min-[480px]:w-12 bg-gradient-to-r from-transparent to-[#f26e21]/60 rounded-full" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26e21]" />
            <span className="h-[1.5px] w-8 min-[480px]:w-12 bg-gradient-to-l from-transparent to-[#f26e21]/60 rounded-full" />
          </div>
          <p className="text-white/50 text-xs min-[480px]:text-sm">
            {subtitle}
          </p>
        </motion.div>

        {/* Video Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Arrows */}
          {multi && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 min-[768px]:-left-12 top-1/2 -translate-y-1/2 z-10 w-9 h-9 min-[768px]:w-11 min-[768px]:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 min-[768px]:-right-12 top-1/2 -translate-y-1/2 z-10 w-9 h-9 min-[768px]:w-11 min-[768px]:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <ChevronRight size={20} className="text-white" />
              </button>
            </>
          )}

          {/* Slide area */}
          <div className="relative rounded-2xl overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                drag={multi ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragStart={multi ? handleDragStart : undefined}
                onDragEnd={multi ? handleDragEnd : undefined}
                onClick={handleClick}
                className="relative bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#222222] overflow-hidden cursor-pointer group select-none"
                style={{ aspectRatio: "21/9" }}
              >
                <img
                  src={thumbnailUrl}
                  alt={video.label || title}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500 pointer-events-none"
                  draggable={false}
                  onError={e => { e.target.src = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=675&fit=crop"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/80 via-transparent to-[#111111]/30 pointer-events-none" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 min-[480px]:w-20 min-[480px]:h-20 min-[768px]:w-24 min-[768px]:h-24 rounded-full bg-[#f26e21]/80 backdrop-blur-sm border-2 border-[#f26e21] flex items-center justify-center group-hover:bg-[#f26e21] transition-all pointer-events-auto"
                  >
                    <Play size={28} className="text-white ml-1 min-[480px]:w-8 min-[480px]:h-8 min-[768px]:w-10 min-[768px]:h-10" fill="white" />
                  </motion.div>
                </div>

                {/* Bottom text */}
                <div className="absolute bottom-0 left-0 right-0 p-4 min-[480px]:p-6 pointer-events-none">
                  <p className="text-white font-bold text-sm min-[480px]:text-base min-[768px]:text-lg">
                    {video.label || title}
                  </p>
                  {multi && (
                    <p className="text-white/50 text-xs mt-1">
                      {current + 1} / {total}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          {multi && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {videos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 h-2.5 bg-[#f26e21]"
                      : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Video Modal */}
        <AnimatePresence>
          {playing && embedUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setPlaying(false)}
            >
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-4 right-4 min-[480px]:top-6 min-[480px]:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <X size={22} className="text-white" />
              </button>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <iframe
                  src={embedUrl}
                  title={video.label || title}
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
