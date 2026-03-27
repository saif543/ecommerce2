"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Demo slides for testing — replaced by admin slider API data
const FALLBACK_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop",
    link: "",
  },
  {
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&h=600&fit=crop",
    link: "",
  },
  {
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&h=600&fit=crop",
    link: "",
  },
  {
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&h=600&fit=crop",
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
  const router = useRouter();

  const handleSlideClick = () => {
    if (slide.link) {
      router.push(slide.link);
    }
  };

  return (
    <section className="relative w-full overflow-hidden select-none lg:max-h-[340px]" style={{ aspectRatio: '21/6', minHeight: '180px', maxHeight: '400px' }}>
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

      {/* Side vignette overlays */}
      <div className="absolute inset-y-0 left-0 w-16 min-[768px]:w-24 bg-gradient-to-r from-black/25 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 min-[768px]:w-24 bg-gradient-to-l from-black/25 to-transparent z-10 pointer-events-none" />
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 min-[480px]:left-3 min-[768px]:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 min-[480px]:w-9 min-[480px]:h-9 min-[768px]:w-11 min-[768px]:h-11 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 min-[480px]:right-3 min-[768px]:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 min-[480px]:w-9 min-[480px]:h-9 min-[768px]:w-11 min-[768px]:h-11 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </>
      )}

      {/* Bottom Dots */}
      <div className="absolute bottom-6 min-[480px]:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 min-[480px]:gap-3 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={`rounded-full transition-all duration-300 ${i === current
              ? "w-8 min-[480px]:w-10 h-2 min-[480px]:h-2.5 bg-white"
              : "w-2 min-[480px]:w-2.5 h-2 min-[480px]:h-2.5 bg-white/40 hover:bg-white/60"
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
          className="h-full bg-gradient-to-r from-[#f26e21] to-[#ff8c42]"
        />
      </div>
    </section>
  );
}
