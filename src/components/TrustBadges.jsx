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
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-6 md:py-12">
      {/* Mobile: 2x2 grid | Desktop: single row */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-5 md:py-10 px-3 md:px-6">
        <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-4 min-[640px]:gap-0">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`flex flex-col items-center text-center py-3 min-[640px]:py-0 ${i < badges.length - 1 ? "min-[640px]:border-r min-[640px]:border-gray-200" : ""}`}
            >
              <div className="text-purple-mid mb-2 md:mb-4 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-9 md:[&>svg]:h-9">{badge.icon}</div>
              <h3 className="font-bold text-text-primary text-[11px] md:text-base mb-0.5 md:mb-1.5">{badge.title}</h3>
              <p className="text-text-secondary text-[9px] md:text-sm">{badge.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
