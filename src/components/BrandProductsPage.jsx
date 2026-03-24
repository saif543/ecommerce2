"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Tag, Loader2 } from "lucide-react";
import ProductCard from "./ProductCard";
import { sampleProducts, sampleHeadphones, sampleBrandProducts } from "@/data/sampleProducts";

const allSampleProducts = [...sampleProducts, ...sampleHeadphones, ...sampleBrandProducts];

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getProductsForBrand(slug, products) {
  return products.filter((p) => {
    const brand = p.brand || p.customFields?.brand || "";
    return toSlug(brand) === slug;
  });
}

function getBrandDisplayName(slug) {
  const allBrands = [...new Set(allSampleProducts.map((p) => p.brand).filter(Boolean))];
  return allBrands.find((b) => toSlug(b) === slug) || decodeURIComponent(slug).replace(/-/g, " ");
}

export default function BrandProductsPage({ slug }) {
  const displayName = getBrandDisplayName(slug);
  const sampleFiltered = getProductsForBrand(slug, allSampleProducts);

  // Start with sample products immediately
  const [products, setProducts] = useState(sampleFiltered);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/product?limit=1000");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        const dbProducts = data.products || [];
        const filtered = getProductsForBrand(slug, dbProducts);
        if (!cancelled && filtered.length > 0) {
          setProducts(filtered);
        }
      } catch {
        // Keep sample products (already set as initial state)
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <section className="max-w-[1440px] mx-auto px-2 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 pt-4 min-[768px]:pt-6 pb-8">
      {/* Banner */}
      <div className="w-full h-20 min-[480px]:h-24 min-[640px]:h-28 min-[768px]:h-32 min-[1024px]:h-36 rounded-xl min-[480px]:rounded-2xl overflow-hidden mb-4 min-[768px]:mb-5"
        style={{ background: "linear-gradient(135deg, #111111 0%, #1a1a1a 50%, #222222 100%)" }}
      />

      {/* Heading */}
      <div className="mb-4 min-[768px]:mb-5">
        <Link href="/brands" className="inline-flex items-center gap-1 text-gray-400 text-[10px] min-[480px]:text-xs hover:text-gray-600 transition-colors mb-1">
          <ArrowLeft size={12} />
          All Brands
        </Link>
        <h1 className="text-lg min-[480px]:text-xl min-[768px]:text-2xl font-bold text-gray-900">
          {displayName}
        </h1>
        <p className="text-gray-400 text-[10px] min-[480px]:text-xs min-[768px]:text-sm mt-0.5">
          {products.length} {products.length === 1 ? "product" : "products"} found
        </p>
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-lg mb-4">No products found for this brand.</p>
          <Link
            href="/brands"
            className="text-sm text-purple-mid font-semibold underline underline-offset-2"
          >
            Browse all brands
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 min-[640px]:grid-cols-3 min-[1024px]:grid-cols-4 min-[1280px]:grid-cols-5 gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-5">
          {products.map((product, i) => (
            <ProductCard key={String(product._id || product.id)} product={product} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
