import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartPage from "@/components/CartPage";

export default function Cart() {
  return (
    <main className="min-h-screen bg-offwhite">
      <Navbar />
      <Suspense>
        <CartPage />
      </Suspense>
      <Footer />
    </main>
  );
}
