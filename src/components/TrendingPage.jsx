"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Grid3X3, LayoutList, Star, SlidersHorizontal, X, TrendingUp, Flame, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "./ProductCard";

const sortOptions = [
  { label: "Most Popular", value: "default" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Biggest Discount", value: "discount" },
  { label: "Name: A to Z", value: "name-asc" },
  { label: "Name: Z to A", value: "name-desc" },
  { label: "Newest First", value: "newest" },
];

const trendingTags = ["All", "Hot Deals", "Best Sellers", "New Arrivals", "Top Rated"];

function FilterSection({ title, isOpen, onToggle, children }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="flex items-center justify-between w-full py-4 px-1 text-left">
        <span className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pb-4 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TrendingPage() {
  const [sortBy, setSortBy] = useState("default");
  const [gridView, setGridView] = useState("grid");
  const [activeTag, setActiveTag] = useState("All");
  const [openFilter, setOpenFilter] = useState("price");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(9999999);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const toggleFilter = (key) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  };

  const { addToCart } = useCart();

  // Fetch trending products from DB
  useEffect(() => {
    fetch("/api/product?isTrending=true&limit=100")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        const prods = data.products || [];
        setProducts(prods);
        // Set price range based on actual products
        if (prods.length > 0) {
          const prices = prods.map((p) => p.price || 0);
          setPriceMax(Math.max(...prices));
        }
      })
      .catch((err) => console.error("Failed to fetch trending products:", err))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique brands from fetched products (using category or brand field)
  const allBrands = useMemo(() => {
    const brands = products
      .map((p) => p.customFields?.brand || p.brand || p.category || "")
      .filter(Boolean);
    return [...new Set(brands)];
  }, [products]);

  const availabilityOptions = ["In Stock", "Out of Stock"];

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedDiscount !== null ||
    selectedAvailability.length > 0;

  const resetAll = () => {
    const prices = products.map((p) => p.price || 0);
    setPriceMin(0);
    setPriceMax(products.length > 0 ? Math.max(...prices) : 9999999);
    setSelectedBrands([]);
    setSelectedDiscount(null);
    setSelectedAvailability([]);
  };

  const toggleItem = (list, setList, item) => {
    setList((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const sortedProducts = useMemo(() => {
    // Normalize each product: price=regular, discount=sale price
    let sorted = products.map((p) => {
      const regularPrice = p.price || 0;
      const salePrice = (p.discount && p.discount > 0 && p.discount < regularPrice) ? p.discount : regularPrice;
      const savedAmount = regularPrice - salePrice;
      const discountPct = regularPrice > 0 ? Math.round((savedAmount / regularPrice) * 100) : 0;
      const brandName = p.customFields?.brand || p.brand || p.category || "";
      const imageUrl = p.images && p.images.length > 0 ? p.images[0].url : p.image || "/placeholder.png";
      const isInStock = p.stock === "in_stock" || p.stock === "In Stock";
      return { ...p, _normalPrice: salePrice, _regularPrice: regularPrice, _savedAmount: savedAmount, _discountPct: discountPct, _brand: brandName, _image: imageUrl, _isInStock: isInStock };
    });

    switch (sortBy) {
      case "price-asc": sorted.sort((a, b) => a._normalPrice - b._normalPrice); break;
      case "price-desc": sorted.sort((a, b) => b._normalPrice - a._normalPrice); break;
      case "discount": sorted.sort((a, b) => b._discountPct - a._discountPct); break;
      case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "newest": sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: break;
    }
    if (selectedBrands.length > 0) sorted = sorted.filter((p) => selectedBrands.includes(p._brand));
    sorted = sorted.filter((p) => p._normalPrice >= priceMin && p._normalPrice <= priceMax);
    if (selectedDiscount !== null) sorted = sorted.filter((p) => p._discountPct >= selectedDiscount);
    if (selectedAvailability.length > 0) {
      sorted = sorted.filter((p) => {
        if (selectedAvailability.includes("In Stock") && p._isInStock) return true;
        if (selectedAvailability.includes("Out of Stock") && !p._isInStock) return true;
        return false;
      });
    }
    return sorted;
  }, [sortBy, selectedBrands, priceMin, priceMax, selectedDiscount, selectedAvailability, products]);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 9999999;
    return Math.max(...products.map((p) => p.price || 0));
  }, [products]);

  const filterContent = (
    <>
      <FilterSection title="Price" isOpen={openFilter === "price"} onToggle={() => toggleFilter("price")}>
        <div className="text-center text-sm font-medium text-text-primary mb-3">
          ৳{priceMin.toLocaleString()} – ৳{priceMax.toLocaleString()}
        </div>
        <input type="range" min={0} max={maxPrice} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-purple-mid mb-3" />
        <div className="flex items-center gap-3">
          <input type="number" value={priceMin} onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-purple-mid transition-colors" placeholder="Min" />
          <input type="number" value={priceMax} onChange={(e) => setPriceMax(Math.min(maxPrice, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-purple-mid transition-colors" placeholder="Max" />
        </div>
      </FilterSection>

    </>
  );

  return (
    <section className="max-w-[1440px] mx-auto px-2 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-soft rounded-full flex items-center justify-center">
            <TrendingUp size={20} className="text-purple-dark" />
          </div>
          <h1 className="text-xl min-[480px]:text-2xl min-[768px]:text-3xl md:text-4xl font-semibold text-text-primary">Trending Now</h1>
        </div>
        <p className="text-text-secondary text-xs min-[480px]:text-sm min-[768px]:text-base">The hottest products people are loving right now</p>
      </div>

      {/* Trending tags — hidden on mobile, scrollable row on tablet+ */}
      <div className="hidden min-[640px]:flex flex-wrap gap-2 min-[768px]:gap-3 mb-4 min-[768px]:mb-8">
        {trendingTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 min-[768px]:px-4 py-1.5 min-[768px]:py-2 rounded-full text-xs min-[768px]:text-sm font-medium transition-all ${activeTag === tag
              ? "bg-purple-dark text-white shadow-md"
              : "bg-white text-text-secondary border border-gray-200 hover:border-purple-mid hover:text-purple-mid"
              }`}
          >
            {tag === "Hot Deals" && <Flame size={14} className="inline mr-1.5 -mt-0.5" />}
            {tag}
          </button>
        ))}
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 min-[768px]:hidden"
              onClick={() => setMobileFilterOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-[300px] bg-white z-50 min-[768px]:hidden overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <span className="text-base font-bold text-text-primary">Filter By</span>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button onClick={resetAll} className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">Reset</button>
                  )}
                  <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-8">{filterContent}</div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
                <button onClick={() => setMobileFilterOpen(false)} className="w-full bg-purple-dark text-white text-sm font-semibold py-3 rounded-lg hover:bg-purple-mid transition-colors">
                  Show {sortedProducts.length} Products
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex gap-3 min-[768px]:gap-4 min-[1024px]:gap-6">
        {/* Sidebar filters — desktop */}
        <aside className="hidden min-[768px]:block w-48 min-[1024px]:w-56 min-[1280px]:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-bold text-text-primary">Filter By</span>
              {hasActiveFilters && (
                <button onClick={resetAll} className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">Reset</button>
              )}
            </div>
            <div className="px-4">{filterContent}</div>
          </div>
        </aside>

        {/* Right content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 min-[480px]:gap-3 mb-3 min-[480px]:mb-4 min-[768px]:mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="min-[768px]:hidden flex items-center gap-2 bg-white border border-gray-200 text-xs min-[480px]:text-sm font-medium text-text-primary px-2.5 min-[480px]:px-3 py-1.5 min-[480px]:py-2 rounded-lg hover:border-purple-mid transition-colors"
              >
                <SlidersHorizontal size={16} />
                Filters
                {hasActiveFilters && <span className="w-2 h-2 bg-purple-mid rounded-full" />}
              </button>
              <span className="text-[10px] min-[480px]:text-xs min-[768px]:text-sm text-text-muted">
                Showing <span className="font-semibold text-text-primary">{loading ? "..." : sortedProducts.length}</span> products
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 text-[10px] min-[480px]:text-xs min-[768px]:text-sm text-text-primary font-medium px-2 min-[480px]:px-3 py-1.5 min-[480px]:py-2 rounded-lg outline-none cursor-pointer hover:border-purple-mid focus:border-purple-mid transition-colors"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setGridView("grid")} className={`p-1.5 rounded-md transition-colors ${gridView === "grid" ? "bg-white shadow-sm text-purple-dark" : "text-text-muted"}`}>
                  <Grid3X3 size={16} />
                </button>
                <button onClick={() => setGridView("list")} className={`p-1.5 rounded-md transition-colors ${gridView === "list" ? "bg-white shadow-sm text-purple-dark" : "text-text-muted"}`}>
                  <LayoutList size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-purple-mid" size={32} />
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted text-lg mb-4">No trending products found{hasActiveFilters ? " matching your filters" : ""}.</p>
              {hasActiveFilters && <button onClick={resetAll} className="text-sm text-purple-mid font-semibold underline underline-offset-2">Clear all filters</button>}
            </div>
          ) : gridView === "grid" ? (
            <div className="grid grid-cols-2 min-[640px]:grid-cols-3 min-[768px]:grid-cols-2 min-[920px]:grid-cols-3 min-[1280px]:grid-cols-4 gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-4">
              {sortedProducts.map((product, i) => (
                <ProductCard key={String(product._id || product.id)} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2 min-[480px]:space-y-3 min-[768px]:space-y-4">
              {sortedProducts.map((product, i) => {
                const productId = String(product._id || product.id);
                const regularPrice = product._regularPrice || 0;
                const salePrice = product._normalPrice || 0;
                const savedAmount = product._savedAmount || 0;
                return (
                  <motion.div key={productId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
                    <Link href={`/product/${productId}`}>
                      <div className="bg-white rounded-lg min-[480px]:rounded-xl overflow-hidden flex group hover:shadow-md transition-all duration-300">
                        <div className="relative w-24 min-[480px]:w-32 min-[640px]:w-40 min-[768px]:w-48 h-28 min-[480px]:h-32 min-[640px]:h-36 min-[768px]:h-44 bg-offwhite flex-shrink-0 overflow-hidden">
                          <Image src={product._image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="200px" />
                        </div>
                        <div className="flex-1 p-2 min-[480px]:p-3 min-[640px]:p-4 min-[768px]:p-5 flex flex-col justify-center">
                          <p className="text-[8px] min-[480px]:text-[9px] min-[768px]:text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-0.5">{product._brand}</p>
                          <h3 className="text-[10px] min-[480px]:text-xs min-[768px]:text-sm font-semibold text-text-primary mb-1 min-[480px]:mb-1.5 min-[768px]:mb-2 group-hover:text-purple-dark transition-colors line-clamp-1">{product.name}</h3>
                          <p className="text-[9px] min-[480px]:text-[10px] min-[768px]:text-sm text-text-secondary mb-1.5 min-[768px]:mb-3 line-clamp-2 hidden min-[480px]:block">{product.description}</p>
                          {product._isInStock ? (
                            <div className="flex items-baseline gap-1.5 min-[480px]:gap-2 min-[768px]:gap-3">
                              <span className="text-[11px] min-[480px]:text-sm min-[768px]:text-lg font-semibold text-text-primary whitespace-nowrap">Tk {Math.round(salePrice).toLocaleString("en-IN")}</span>
                              {savedAmount > 0 && (
                                <>
                                  <span className="text-[8px] min-[480px]:text-[10px] min-[768px]:text-xs text-text-muted line-through whitespace-nowrap">Tk {Math.round(regularPrice).toLocaleString("en-IN")}</span>
                                  <span className="hidden min-[640px]:inline text-[10px] min-[768px]:text-xs text-green-600 font-semibold whitespace-nowrap">Save Tk {Math.round(savedAmount).toLocaleString("en-IN")}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block text-[8px] min-[480px]:text-[9px] min-[768px]:text-xs font-bold px-1.5 min-[768px]:px-3 py-0.5 min-[768px]:py-1.5 rounded-full bg-red-100 text-red-600">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
