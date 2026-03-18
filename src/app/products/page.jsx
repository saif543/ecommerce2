import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductsView from "@/components/ProductsView";

export const metadata = {
    title: "Products - ZenTech",
    description: "Browse our collection of premium products",
};

export default function ProductsPage() {
    return (
        <div className="min-h-screen bg-offwhite flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Suspense>
                    <ProductsView />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
