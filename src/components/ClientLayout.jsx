"use client";

import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";

export default function ClientLayout({ children }) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition>{children}</PageTransition>
    </AnimatePresence>
  );
}
