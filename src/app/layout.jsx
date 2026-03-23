import { Poppins } from "next/font/google";
import "./globals.css";
import { WishlistProvider } from "@/context/WishlistContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import MessengerChat from "@/components/MessengerChat";
import ClientLayout from "@/components/ClientLayout";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "ZenTech - Shop the Best Deals",
  description: "Your one-stop shop for electronics, gadgets, and more",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${poppins.className} ${poppins.variable} antialiased pb-16 md:pb-0`}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ClientLayout>{children}</ClientLayout>
              <MessengerChat />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
