"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Fallback slide
const FALLBACK_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&h=700&fit=crop",
    link: "",
  },
];

const SWIPE_THRESHOLD = 50;

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

function mapApiSlide(s) {
  const imageUrl = s.image?.url || s.image || '';
  return {
    image: imageUrl,
    link: s.link || '',
  };
}

export default function Hero() {
  const [[current, direction], setSlide] = useState([0, 1]);
  const timerRef = useRef(null);
  const [slides, setSlides] = useState(FALLBACK_SLIDES);

  useEffect(() => {
    fetch("/api/slider")
      .then((res) => res.json())
      .then((data) => {
        const active = (data.slides || data.sliders || []).filter((s) => s.isActive);
        if (active.length > 0) {
          setSlides(active.map(mapApiSlide));
          setSlide([0, 1]);
        }
      })
      .catch(() => { });
  }, []);

  const goTo = useCallback(
    (index, dir) => {
      setSlide(([prev]) => {
        const d = dir ?? (index > prev ? 1 : -1);
        return [((index % slides.length) + slides.length) % slides.length, d];
      });
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide(([c]) => [(c + 1) % slides.length, 1]);
    }, 5000);
  }, [slides.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, resetTimer]);

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) next();
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) prev();
  };

  const slide = slides[current];

  const handleSlideClick = () => {
    if (slide.link) {
      window.open(slide.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="relative w-full overflow-hidden select-none lg:max-h-[400px]" style={{ aspectRatio: '21/7', minHeight: '220px', maxHeight: '520px' }}>
      {/* Background Images */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          onClick={handleSlideClick}
          className={`absolute inset-0 ${slide.link ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        >
          {slide.image ? (
            <Image
              src={slide.image}
              alt="Slide"
              fill
              className="object-cover pointer-events-none"
              sizes="100vw"
              priority
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gray-800" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Left / Right Arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      {/* Bottom Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={`rounded-full transition-all duration-300 ${i === current
              ? "w-10 h-2.5 bg-white"
              : "w-2.5 h-2.5 bg-white/40 hover:bg-white/60"
              }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
        <motion.div
          key={current}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="h-full bg-gradient-to-r from-[#222222] to-[#FF9F43]"
        />
      </div>
    </section>
  );
}
