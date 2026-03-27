"use client";

import { Truck, ShieldCheck, RefreshCw, Headphones, Zap } from "lucide-react";

const ITEMS = [
  { icon: Truck, text: "Free Shipping Over $50" },
  { icon: ShieldCheck, text: "100% Authentic Products" },
  { icon: RefreshCw, text: "Easy 30-Day Returns" },
  { icon: Headphones, text: "24/7 Customer Support" },
  { icon: Zap, text: "Flash Deals Every Week" },
];

export default function PromoStrip() {
  return (
    <div className="bg-[#111111] overflow-hidden select-none">
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker 30s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track flex items-center w-max py-2.5 min-[480px]:py-3">
        {[...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS].map((item, i) => (
          <div key={i} className="flex items-center gap-2 min-[480px]:gap-2.5 px-5 min-[480px]:px-8 min-[768px]:px-10 flex-shrink-0">
            <item.icon size={13} className="text-[#f26e21] flex-shrink-0" strokeWidth={2} />
            <span className="text-white/80 text-[10px] min-[480px]:text-xs font-medium whitespace-nowrap tracking-wide uppercase">{item.text}</span>
            <span className="text-white/20 ml-3 min-[480px]:ml-5">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}
