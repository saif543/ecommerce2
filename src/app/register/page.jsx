import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegisterPage from "@/components/RegisterPage";

export default function Register() {
  return (
    <main className="min-h-screen bg-offwhite">
      <Navbar />
      <RegisterPage />
      <Footer />
    </main>
  );
}
