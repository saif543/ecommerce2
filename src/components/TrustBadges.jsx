"use client";

import React from "react";
import { motion } from "framer-motion";
import { Headset, CreditCard, ShieldCheck, Rocket } from "lucide-react";

const badges = [
  {
    icon: <Headset size={36} strokeWidth={1.5} />,
    title: "24/7 Support",
    desc: "Round-the-clock online assistance",
  },
  {
    icon: <CreditCard size={36} strokeWidth={1.5} />,
    title: "Secure Payment",
    desc: "Hassle-free cashless transactions",
  },
  {
    icon: <ShieldCheck size={36} strokeWidth={1.5} />,
    title: "100% Genuine",
    desc: "Every product is verified authentic",
  },
  {
    icon: <Rocket size={36} strokeWidth={1.5} />,
    title: "Express Delivery",
    desc: "Swift shipping right to your door",
  },
];

export default function TrustBadges() {
  return (
    <section className="py-8 md:py-14" style={{ background: "linear-gradient(180deg, #111111 0%, #1a1714 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-3 md:px-6">
        <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-6 min-[640px]:gap-4">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center py-3 min-[640px]:py-0"
            >
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-[#f26e21]/15 flex items-center justify-center mb-2.5 md:mb-4">
                <div className="text-[#f26e21] [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-7 md:[&>svg]:h-7">{badge.icon}</div>
              </div>
              <h3 className="font-bold text-white text-[11px] md:text-base mb-0.5 md:mb-1.5">{badge.title}</h3>
              <p className="text-white/40 text-[9px] md:text-sm">{badge.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
