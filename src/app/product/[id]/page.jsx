import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";
import { sampleProducts, sampleHeadphones, sampleBrandProducts } from "@/data/sampleProducts";

const allSampleProducts = [...sampleProducts, ...sampleHeadphones, ...sampleBrandProducts];

function findSampleProduct(id) {
  return allSampleProducts.find((p) => p._id === id) || null;
}

function getSampleRelated(product) {
  if (!product) return [];
  return allSampleProducts
    .filter((p) => p.category === product.category && p._id !== product._id)
    .slice(0, 4);
}

export default async function ProductPage({ params }) {
  const { id } = await params;

  // Check sample data first
  const sampleProduct = findSampleProduct(id);
  if (sampleProduct) {
    // Normalize sample product to match DB product shape
    const product = {
      ...sampleProduct,
      images: sampleProduct.image ? [{ url: sampleProduct.image, isPrimary: true }] : [],
    };
    const relatedProducts = getSampleRelated(sampleProduct).map((p) => ({
      ...p,
      images: p.image ? [{ url: p.image, isPrimary: true }] : [],
    }));
    return (
      <div className="min-h-screen bg-offwhite">
        <Navbar />
        <ProductDetail product={product} relatedProducts={relatedProducts} />
        <Footer />
      </div>
    );
  }

  // Otherwise fetch from API
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  let product = null;
  let relatedProducts = [];

  try {
    const res = await fetch(`${baseUrl}/api/product?id=${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) return notFound();
      throw new Error(`Failed to fetch product: ${res.status}`);
    }

    const data = await res.json();
    product = data.product;

    if (!product) return notFound();

    // Fetch related products from same category
    try {
      const catRes = await fetch(
        `${baseUrl}/api/product?category=${encodeURIComponent(product.category || "")}&limit=5`,
        { cache: "no-store" }
      );
      if (catRes.ok) {
        const catData = await catRes.json();
        relatedProducts = (catData.products || [])
          .filter((p) => String(p._id) !== id)
          .slice(0, 4);
      }
    } catch (e) {
      console.error("Failed to fetch related products", e);
    }
  } catch (error) {
    console.error("Product fetch error:", error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <ProductDetail product={product} relatedProducts={relatedProducts} />
      <Footer />
    </div>
  );
}
