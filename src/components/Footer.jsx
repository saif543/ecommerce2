"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  Shop: [
    { label: "All Products", href: "/products" },
    { label: "Trending", href: "/trending" },
    { label: "Brands", href: "/brands" },
  ],
  Account: [
    { label: "Login", href: "/login" },
    { label: "Register", href: "/register" },
    { label: "Cart", href: "/cart" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Support", href: "/support" },
  ],
};

const socialIcons = [Facebook, Instagram, Twitter, Youtube];

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#111111] via-[#1a1a1a] to-[#222222] text-white overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#F47B20] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">Z</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">ZenTech</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-5 max-w-xs">
              Premium electronics for modern living. Quality products, curated with care for everyday use.
            </p>
            <div className="flex items-center gap-3">
              {socialIcons.map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 border border-white/20 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-purple-mid transition-colors"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
            >
              <h4 className="font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/50 text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-white/10 mt-12 pt-6 text-center"
        >
          <p className="text-white/30 text-xs">
            &copy; 2026 ZenTech. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
