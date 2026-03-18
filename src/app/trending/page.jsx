import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrendingPage from "@/components/TrendingPage";

export default function Page() {
  return (
    <main className="min-h-screen bg-offwhite">
      <Navbar />
      <TrendingPage />
      <Footer />
    </main>
  );
}
