import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <Hero />
      <Categories />
      <Products
        title="Most Loved Products"
        subtitle="Discover our top picks for a premium lifestyle"
        apiUrl="/api/product?isLovedProduct=true&limit=10"
        bg="bg-white"
        section="most-loved"
        bannerGradient="linear-gradient(135deg, #1a1a1a 0%, #2d1f3d 40%, #B8860B 100%)"
      />
      <Products
        title="New Arrivals"
        subtitle="Fresh drops just for you"
        apiUrl="/api/product?isNewArrival=true&limit=10"
        bg="bg-offwhite"
        section="new-arrivals"
        bannerGradient="linear-gradient(135deg, #0f0f0f 0%, #1a2a1a 40%, #2d6a4f 100%)"
      />
      <TrustBadges />
      <Footer />
    </div>
  );
}
