"use client";

import React from "react";
import { motion } from "framer-motion";
import { Truck, Award, RefreshCw } from "lucide-react";

const badges = [
  {
    icon: <Truck size={36} strokeWidth={1.5} />,
    title: "Free Shipping",
    desc: "On all orders over $99",
  },
  {
    icon: <Award size={36} strokeWidth={1.5} />,
    title: "Quality Guaranteed",
    desc: "100% Authentic Products",
  },
  {
    icon: <RefreshCw size={36} strokeWidth={1.5} />,
    title: "30-Day Return",
    desc: "Money Back Guarantee",
  },
];

export default function TrustBadges() {
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-6 md:py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-5 md:py-10 px-3 md:px-6 flex flex-col min-[488px]:flex-row items-center justify-evenly gap-6 min-[488px]:gap-0">
        {badges.map((badge, i) => (
          <React.Fragment key={badge.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="text-purple-mid mb-2 md:mb-4 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-9 md:[&>svg]:h-9">{badge.icon}</div>
              <h3 className="font-bold text-text-primary text-[11px] md:text-base mb-0.5 md:mb-1.5">{badge.title}</h3>
              <p className="text-text-secondary text-[9px] md:text-sm">{badge.desc}</p>
            </motion.div>

            {i < badges.length - 1 && (
              <div key={`divider-${i}`} className="hidden min-[488px]:block w-px h-10 md:h-16 bg-gray-200 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
