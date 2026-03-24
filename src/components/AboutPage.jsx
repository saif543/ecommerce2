"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Truck,
  Headphones,
  Star,
  Users,
  Package,
  Award,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Happy Customers", value: "50,000+", icon: Users },
  { label: "Products Listed", value: "2,000+", icon: Package },
  { label: "Brands Partnered", value: "80+", icon: Award },
  { label: "Average Rating", value: "4.8 / 5", icon: Star },
];

const values = [
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    description:
      "Every product we sell is sourced directly from authorised distributors. No counterfeits, ever.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description:
      "Same-day dispatch on in-stock orders. Dhaka deliveries arrive within 24 hours.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our team is available every day to help you before, during, and after your purchase.",
  },
  {
    icon: Star,
    title: "Best Price Guarantee",
    description:
      "We match any lower price you find. Quality electronics shouldn't cost a fortune.",
  },
];

const team = [
  {
    name: "ZenTech Rahman",
    role: "Founder & CEO",
    initials: "NR",
    color: "bg-purple-soft text-purple-dark",
    bio: "Passionate about making premium electronics accessible to everyone in Bangladesh.",
  },
  {
    name: "Tanvir Hossain",
    role: "Head of Operations",
    initials: "TH",
    color: "bg-orange-50 text-orange-700",
    bio: "Ensures every order is picked, packed, and delivered with care and speed.",
  },
  {
    name: "Sadia Islam",
    role: "Customer Experience Lead",
    initials: "SI",
    color: "bg-green-50 text-green-700",
    bio: "Dedicated to making sure every customer interaction leaves a smile.",
  },
];

const timeline = [
  { year: "2019", event: "ZenTech founded with 50 products and a small Dhaka warehouse." },
  { year: "2020", event: "Launched our online store and reached 5,000 customers nationwide." },
  { year: "2022", event: "Partnered with 40+ global brands including Apple, Samsung & Sony." },
  { year: "2023", event: "Opened our flagship experience centre in Dhaka." },
  { year: "2024", event: "Crossed 50,000 happy customers and 2,000+ product listings." },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12 space-y-20">

      {/* Hero */}
      <motion.div {...fadeUp(0)} className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-purple-soft text-purple-mid text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
          <Award size={13} />
          Our Story
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-text-primary leading-tight mb-5">
          Bangladesh's most trusted <span className="text-purple-mid">electronics</span> store
        </h1>
        <p className="text-text-secondary text-base leading-relaxed">
          Founded in 2019, ZenTech set out with one mission — bring genuine, premium electronics to
          every corner of Bangladesh at fair prices, backed by service you can count on.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            {...fadeUp(i * 0.08)}
            className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="w-11 h-11 bg-purple-soft text-purple-mid rounded-xl flex items-center justify-center mx-auto mb-3">
              <stat.icon size={20} />
            </div>
            <p className="font-serif text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <motion.div {...fadeUp(0.1)}>
          <p className="text-xs font-semibold text-purple-mid uppercase tracking-widest mb-3">Our Mission</p>
          <h2 className="font-serif text-3xl text-text-primary leading-snug mb-5">
            Making great technology <br className="hidden md:block" /> accessible to all
          </h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            We believe everyone deserves access to quality electronics without the fear of fake
            products, inflated prices, or poor after-sales support. ZenTech was built to change that.
          </p>
          <p className="text-text-secondary leading-relaxed mb-6">
            From a student's first pair of earbuds to a professional's workstation setup — we've
            got every need covered, delivered to your door with a smile.
          </p>
          <Link
            href="/brands"
            className="inline-flex items-center gap-2 bg-purple-dark hover:bg-purple-mid text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Explore Our Brands <ArrowRight size={15} />
          </Link>
        </motion.div>

        <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-purple-soft text-purple-mid rounded-xl flex items-center justify-center mb-3">
                <v.icon size={18} />
              </div>
              <p className="font-semibold text-sm text-text-primary mb-1">{v.title}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{v.description}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Timeline */}
      <motion.div {...fadeUp(0.1)}>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-purple-mid uppercase tracking-widest mb-2">How We Got Here</p>
          <h2 className="font-serif text-3xl text-text-primary">Our Journey</h2>
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-purple-muted" />
          <div className="space-y-8">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-6 pl-14 relative"
              >
                <div className="absolute left-0 w-10 h-10 bg-purple-dark text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.year.slice(2)}
                </div>
                <div className="bg-white rounded-xl px-5 py-3.5 border border-gray-100 shadow-sm flex-1">
                  <p className="text-xs font-bold text-purple-mid mb-0.5">{item.year}</p>
                  <p className="text-sm text-text-secondary">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Team */}
      <motion.div {...fadeUp(0.1)}>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-purple-mid uppercase tracking-widest mb-2">The People Behind ZenTech</p>
          <h2 className="font-serif text-3xl text-text-primary">Meet the Team</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 ${member.color}`}>
                {member.initials}
              </div>
              <p className="font-semibold text-text-primary text-sm">{member.name}</p>
              <p className="text-xs text-purple-mid font-medium mt-0.5 mb-3">{member.role}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        {...fadeUp(0.1)}
        className="bg-purple-dark rounded-3xl px-8 py-14 text-center text-white"
      >
        <h2 className="font-serif text-3xl md:text-4xl mb-4">Ready to shop with confidence?</h2>
        <p className="text-purple-muted text-sm mb-4 max-w-md mx-auto">
          Thousands of genuine products, fast delivery, and a team that's always here for you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-purple-muted mb-8">
          <a href="mailto:nisatkhan890@gmail.com" className="hover:text-white transition-colors">nisatkhan890@gmail.com</a>
          <span className="hidden sm:inline">|</span>
          <a href="https://m.me/profile.php?id=61579377832787" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Message us on Facebook</a>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-white text-purple-dark hover:bg-purple-soft text-sm font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Shop Now
          </Link>
          <Link
            href="/support"
            className="border border-purple-muted text-white hover:bg-white/10 text-sm font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
