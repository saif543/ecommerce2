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
        apiUrl="/api/product?isLovedProduct=true&limit=8"
        bg="bg-white"
        section="most-loved"
        bannerGradient="linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)"
        seeAllLink="/products"
      />
      <Products
        title="New Arrivals"
        subtitle="Fresh drops just for you"
        apiUrl="/api/product?isNewArrival=true&limit=8"
        bg="bg-offwhite"
        section="new-arrivals"
        bannerGradient="linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)"
        seeAllLink="/products"
      />
      <Products
        title="Headphones"
        subtitle="Immerse yourself in crystal-clear sound"
        apiUrl="/api/product?category=Headphones&limit=8"
        bg="bg-white"
        section="headphones"
        bannerGradient="linear-gradient(135deg, #0f3460 0%, #16213e 40%, #1a1a2e 100%)"
        seeAllLink="/products?category=Headphones"
      />
      <TrustBadges />
      <Footer />
    </div>
  );
}
