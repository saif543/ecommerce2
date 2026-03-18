"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function FeaturedCategories() {
  return (
    <section className="max-w-[1440px] mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Large Left Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden h-[200px] md:h-[420px] group cursor-pointer"
        >
          <Image
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop"
            alt="Wireless Headphones"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8">
            <h3 className="font-serif text-2xl text-white mb-1">Wireless Audio</h3>
            <p className="text-white/70 text-xs mb-4 uppercase tracking-wider">Up to 40% Off</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-card-white text-text-primary text-xs font-semibold px-5 py-2.5 rounded-md hover:bg-purple-dark hover:text-white transition-colors"
            >
              Shop Now
            </motion.button>
          </div>
        </motion.div>

        {/* Right Stack */}
        <div className="flex flex-col gap-5">
          {/* Top Right Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden h-[200px] group cursor-pointer"
          >
            <Image
              src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=400&fit=crop"
              alt="Keyboards"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
            <div className="absolute top-1/2 -translate-y-1/2 left-8">
              <h3 className="font-serif text-xl text-white mb-1">Mechanical<br />Keyboards</h3>
              <p className="text-white/70 text-xs mb-3 uppercase tracking-wider">Up to 30% Off</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-card-white text-text-primary text-xs font-semibold px-5 py-2 rounded-md hover:bg-purple-dark hover:text-white transition-colors"
              >
                Shop Now
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom Right Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden h-[200px] group cursor-pointer"
          >
            <Image
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop"
              alt="Smart Watches"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
            <div className="absolute top-1/2 -translate-y-1/2 left-8">
              <h3 className="font-serif text-xl text-white mb-1">Smart Watches<br />& Wearables</h3>
              <p className="text-white/70 text-xs mb-3 uppercase tracking-wider">Up to 25% Off</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-card-white text-text-primary text-xs font-semibold px-5 py-2 rounded-md hover:bg-purple-dark hover:text-white transition-colors"
              >
                Shop Now
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
