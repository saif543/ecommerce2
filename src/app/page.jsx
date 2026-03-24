import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import VideoSection from "@/components/VideoSection";
import Categories from "@/components/Categories";
import BrandShowcase from "@/components/BrandShowcase";
import Products from "@/components/Products";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <Hero />
      <Categories />
      <BrandShowcase />
      <Products
        title="Most Loved Products"
        subtitle="Discover our top picks for a premium lifestyle"
        apiUrl="/api/product?isLovedProduct=true&limit=8"
        bg="bg-white"
        section="most-loved"
        bannerGradient="linear-gradient(135deg, #111111 0%, #f26e21 60%, #ff8c42 100%)"
        seeAllLink="/products"
      />
      <Products
        title="New Arrivals"
        subtitle="Fresh drops just for you"
        apiUrl="/api/product?isNewArrival=true&limit=8"
        bg="bg-offwhite"
        section="new-arrivals"
        bannerGradient="linear-gradient(135deg, #f26e21 0%, #111111 50%, #f26e21 100%)"
        seeAllLink="/products"
      />
      <Products
        title="Headphones"
        subtitle="Immerse yourself in crystal-clear sound"
        apiUrl="/api/product?category=Headphones&limit=8"
        bg="bg-white"
        section="headphones"
        bannerGradient="linear-gradient(135deg, #ff8c42 0%, #f26e21 40%, #111111 100%)"
        seeAllLink="/products?category=Headphones"
      />
      <VideoSection />
      <TrustBadges />
      <Footer />
    </div>
  );
}
