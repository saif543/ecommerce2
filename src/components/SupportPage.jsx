"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ChevronDown,
  Package,
  RotateCcw,
  Truck,
  Headphones,
} from "lucide-react";

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const faqs = [
  {
    category: "Orders",
    icon: Package,
    questions: [
      {
        q: "How do I track my order?",
        a: "Once your order is shipped, you'll receive a tracking number via email. You can use this number on our order tracking page or the courier's website to check the real-time status of your delivery.",
      },
      {
        q: "Can I cancel or modify my order?",
        a: "You can cancel or modify your order within 2 hours of placing it. After that, the order enters our fulfillment process. Please contact our support team immediately if you need assistance.",
      },
      {
        q: "What if an item is out of stock after I order?",
        a: "If an item becomes unavailable after your order, we'll notify you immediately and offer a full refund or the option to wait for restock.",
      },
    ],
  },
  {
    category: "Returns & Refunds",
    icon: RotateCcw,
    questions: [
      {
        q: "What is your return policy?",
        a: "We offer a 7-day return policy on all products. Items must be unused, in original packaging with all accessories. Electronics must be returned with the original seal intact if applicable.",
      },
      {
        q: "How long does a refund take?",
        a: "Once we receive and inspect your return, refunds are processed within 3-5 business days. The time to reflect in your account depends on your bank (usually 2-7 additional days).",
      },
      {
        q: "Can I exchange a product?",
        a: "Yes, exchanges are available for the same product in a different variant (color, size) or for a product of equal value. Contact our team to initiate an exchange.",
      },
    ],
  },
  {
    category: "Shipping",
    icon: Truck,
    questions: [
      {
        q: "How long does delivery take?",
        a: "Standard delivery within Dhaka takes 1-2 business days. Deliveries to other cities take 3-5 business days. Express delivery options are available at checkout.",
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes! Orders above Tk 2,000 qualify for free standard shipping within Bangladesh. The discount is applied automatically at checkout.",
      },
      {
        q: "Can I choose a specific delivery time?",
        a: "You can select morning (9am–1pm) or afternoon (2pm–7pm) delivery slots for Dhaka orders during checkout. Slot availability may vary.",
      },
    ],
  },
];

const contactChannels = [
  {
    renderIcon: <WhatsAppIcon />,
    label: "WhatsApp",
    description: "Chat with us on WhatsApp",
    detail: "+880 1700-000000",
    color: "bg-green-50 text-green-600",
    action: "Message Us",
    href: "https://wa.me/8801700000000",
  },
  {
    renderIcon: <Mail size={20} />,
    label: "Email Support",
    description: "Send us a message anytime",
    detail: "nisatkhan890@gmail.com",
    color: "bg-orange-50 text-orange-600",
    action: "Send Email",
    href: "mailto:nisatkhan890@gmail.com",
  },
  {
    renderIcon: <FacebookIcon />,
    label: "Facebook Page",
    description: "Visit and message our page",
    detail: "ZenTech",
    color: "bg-indigo-50 text-indigo-600",
    action: "Visit Page",
    href: "https://m.me/profile.php?id=61579377832787",
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-text-primary pr-4">{question}</span>
        <ChevronDown
          size={16}
          className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-text-secondary leading-relaxed border-t border-gray-100 pt-3">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-purple-soft text-purple-mid text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          <Headphones size={13} />
          We're here to help
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-3">
          Support Center
        </h1>
        <p className="text-text-secondary text-base max-w-xl mx-auto">
          Find answers to common questions or reach out to our team directly.
        </p>
      </motion.div>

      {/* Contact channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
        {contactChannels.map((ch, i) => (
          <motion.div
            key={ch.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-start gap-3 hover:shadow-md transition-shadow"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ch.color}`}>
              {ch.renderIcon}
            </div>
            <div>
              <p className="font-semibold text-text-primary text-sm">{ch.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">{ch.description}</p>
              <p className="text-xs text-text-muted mt-1">{ch.detail}</p>
            </div>
            <a
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto text-xs font-semibold text-purple-mid hover:text-purple-dark transition-colors underline underline-offset-2"
            >
              {ch.action}
            </a>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-text-primary mb-6 text-center">Frequently Asked Questions</h2>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {faqs.map((cat, i) => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(i)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
                activeCategory === i
                  ? "bg-purple-dark text-white border-purple-dark"
                  : "bg-white text-text-secondary border-gray-200 hover:border-purple-mid hover:text-purple-mid"
              }`}
            >
              <cat.icon size={12} />
              {cat.category}
            </button>
          ))}
        </div>

        {/* Questions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {faqs[activeCategory].questions.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
