"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package, Search, ArrowRight } from "lucide-react";

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/brand");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        const brandList = data.brands || [];
        if (!cancelled && brandList.length > 0) {
          // Fetch products to get counts per brand
          const prodRes = await fetch("/api/product?limit=1000");
          const prodData = prodRes.ok ? await prodRes.json() : { products: [] };
          const products = prodData.products || [];
          const countMap = {};
          products.forEach((p) => {
            const b = p.brand || p.customFields?.brand || "";
            if (b) countMap[b] = (countMap[b] || 0) + 1;
          });
          setBrands(brandList.map((b) => ({ name: b.name, logo: b.logo || null, count: countMap[b.name] || 0 })));
        }
      } catch {
        // API failed — brands stays as empty array
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="max-w-[1400px] mx-auto px-3 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 py-6 min-[768px]:py-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl min-[480px]:rounded-3xl h-24 min-[480px]:h-28 min-[768px]:h-36 min-[1024px]:h-40 mb-6 min-[768px]:mb-8"
        style={{ background: "linear-gradient(135deg, #111111 0%, #1a1a1a 50%, #222222 100%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f26e21]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#f26e21]/5 rounded-full blur-3xl" />
      </div>

      {/* Heading */}
      <div className="mb-6 min-[768px]:mb-8">
        <h1 className="text-xl min-[480px]:text-2xl min-[768px]:text-3xl font-bold text-gray-900 mb-1">
          Our Brands
        </h1>
        <p className="text-gray-400 text-sm min-[768px]:text-base">
          Shop from the world's most trusted brands, all in one place
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 min-[768px]:mb-8 max-w-lg">
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-3 shadow-sm focus-within:border-purple-mid focus-within:shadow-md transition-all">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none ml-2.5"
          />
        </div>
      </div>

      {/* Brand count */}
      <p className="text-xs text-gray-400 font-medium mb-4 min-[768px]:mb-6">
        {filtered.length} {filtered.length === 1 ? "brand" : "brands"} found
      </p>

      {/* Grid — 5 cols on PC */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-2 min-[640px]:grid-cols-3 min-[768px]:grid-cols-4 min-[1024px]:grid-cols-5 gap-3 min-[480px]:gap-4 min-[768px]:gap-5">
        {filtered.map((brand, i) => {
          const logoUrl = brand.logo || null;
          return (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              whileHover={{ y: -6, rotateX: 4, rotateY: -2 }}
              style={{ transformPerspective: 800 }}
            >
              <Link href={`/brands/${toSlug(brand.name)}`}>
                <div className="relative bg-white rounded-xl min-[768px]:rounded-2xl overflow-hidden border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300 cursor-pointer group h-full">
                  {/* Top section — logo area */}
                  <div className="bg-gray-50 group-hover:bg-gray-100/80 transition-colors duration-300 flex items-center justify-center py-6 min-[480px]:py-8 min-[768px]:py-10 px-4 relative">
                    {/* Logo / Initial */}
                    <div className="w-12 h-12 min-[480px]:w-14 min-[480px]:h-14 min-[768px]:w-16 min-[768px]:h-16 flex items-center justify-center">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={brand.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <span
                        className="text-gray-700 font-black text-2xl min-[480px]:text-3xl min-[768px]:text-4xl select-none items-center justify-center w-full h-full"
                        style={{ display: logoUrl ? "none" : "flex" }}
                      >
                        {brand.name[0].toUpperCase()}
                      </span>
                    </div>
                    {/* Product count badge */}
                    <span className="absolute top-2 right-2 min-[480px]:top-2.5 min-[480px]:right-2.5 bg-white text-[10px] min-[768px]:text-[11px] font-semibold text-gray-500 px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                      {brand.count}
                    </span>
                  </div>

                  {/* Bottom section — name + action */}
                  <div className="px-3 min-[480px]:px-4 py-3 min-[480px]:py-3.5">
                    <h3 className="text-[13px] min-[480px]:text-sm min-[768px]:text-[15px] font-semibold text-gray-800 truncate group-hover:text-gray-950 transition-colors">
                      {brand.name}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] min-[480px]:text-[11px] text-gray-400">
                        {brand.count} {brand.count === 1 ? "product" : "products"}
                      </span>
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium mb-1">No brands found</p>
          {search && <p className="text-gray-400 text-sm">Try a different search term</p>}
        </div>
      )}
    </section>
  );
}
