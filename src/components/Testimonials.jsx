"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

const reviews = [
  {
    name: "Emily R.",
    role: "Verified Buyer",
    text: "I love everything I've ordered from ZenTech. The quality is excellent and I feel good knowing my purchases are worth every penny.",
  },
  {
    name: "Sarah K.",
    role: "Verified Buyer",
    text: "Amazing product quality and super fast shipping. The customer service team was incredibly helpful with my order inquiry.",
  },
  {
    name: "James M.",
    role: "Verified Buyer",
    text: "Best online shopping experience I've had. The products arrived perfectly packaged and exactly as described on the site.",
  },
];

export default function Testimonials() {
  return (
    <section className="max-w-[1440px] mx-auto px-6 py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-3">Hear From Our Customers</h2>
        <p className="text-text-secondary text-sm">See why our customers love us</p>
      </motion.div>

      {/* Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, i) => (
          <motion.div
            key={review.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-card-white rounded-xl p-8 border border-gray-100 transition-shadow hover:shadow-md"
          >
            {/* Quote */}
            <div className="text-purple-mid/30 text-5xl font-serif leading-none mb-4">&ldquo;</div>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">{review.text}</p>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-soft rounded-full flex items-center justify-center">
                <User size={18} className="text-purple-mid" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{review.name}</p>
                <p className="text-xs text-text-muted">{review.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
