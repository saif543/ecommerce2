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
    <footer className="text-white overflow-hidden">
      {/* Main Footer */}
      <div className="bg-gradient-to-b from-[#111111] via-[#1a1a1a] to-[#161616]">
        <div className="max-w-[1440px] mx-auto px-4 min-[480px]:px-6 py-10 min-[768px]:py-14">
          <div className="grid grid-cols-2 min-[640px]:grid-cols-2 lg:grid-cols-5 gap-8 min-[768px]:gap-10">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="col-span-2"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-[#f26e21] to-[#ff8c42] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(242,110,33,0.3)]">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <span className="text-xl font-semibold tracking-tight">ZenTech</span>
              </div>
              <p className="text-white/45 text-sm leading-relaxed mb-5 max-w-xs">
                Premium electronics for modern living. Quality products, curated with care for everyday use.
              </p>
              <div className="flex items-center gap-3">
                {socialIcons.map((Icon, i) => (
                  <motion.a
                    key={i}
                    href="#"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-[#f26e21]/20 hover:border-[#f26e21]/40 transition-all duration-300"
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
                <h4 className="font-semibold text-sm mb-4 text-white/90">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-white/40 text-sm hover:text-[#f26e21] transition-colors duration-200">
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
            className="border-t border-white/[0.06] mt-10 min-[768px]:mt-12 pt-6 flex flex-col min-[640px]:flex-row items-center justify-between gap-3"
          >
            <p className="text-white/25 text-xs">
              &copy; 2026 ZenTech. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-white/25 text-xs hover:text-white/50 transition-colors">Privacy Policy</Link>
              <Link href="/about" className="text-white/25 text-xs hover:text-white/50 transition-colors">Terms of Service</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
