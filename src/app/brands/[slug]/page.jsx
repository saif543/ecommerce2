import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandProductsPage from "@/components/BrandProductsPage";
import { use } from "react";

export default function BrandDetail({ params }) {
  const { slug } = use(params);
  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <BrandProductsPage slug={slug} />
      <Footer />
    </div>
  );
}
