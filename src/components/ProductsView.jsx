"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Grid3X3, LayoutList, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "./ProductCard";

function formatPrice(n) {
    return Math.round(n).toLocaleString("en-IN");
}

const sortOptions = [
    { label: "Default", value: "default" },
    { label: "Price: Low to High", value: "price-asc" },
    { label: "Price: High to Low", value: "price-desc" },
    { label: "Biggest Discount", value: "discount" },
    { label: "Name: A to Z", value: "name-asc" },
    { label: "Name: Z to A", value: "name-desc" },
    { label: "Newest First", value: "newest" },
];

function FilterSection({ title, isOpen, onToggle, children }) {
    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                onClick={onToggle}
                className="flex items-center justify-between w-full py-4 px-1 text-left"
            >
                <span className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</span>
                <ChevronDown
                    size={16}
                    className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-4 px-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterContent({
    openFilter, toggleFilter,
    priceMin, priceMax, setPriceMin, setPriceMax,
    allBrands, selectedBrands, setSelectedBrands,
    selectedDiscount, setSelectedDiscount,
    availabilityOptions, selectedAvailability, setSelectedAvailability,
    toggleItem,
    maxPriceLimit,
}) {
    return (
        <>
            <FilterSection title="Price" isOpen={openFilter === "price"} onToggle={() => toggleFilter("price")}>
                <div className="text-center text-sm font-medium text-text-primary mb-3">
                    ৳{priceMin.toLocaleString()} – ৳{priceMax.toLocaleString()}
                </div>
                <input type="range" min={0} max={maxPriceLimit} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-purple-mid mb-3" />
                <div className="flex items-center gap-3">
                    <input type="number" value={priceMin} onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-purple-mid transition-colors" placeholder="Min" />
                    <input type="number" value={priceMax} onChange={(e) => setPriceMax(Math.min(maxPriceLimit, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-purple-mid transition-colors" placeholder="Max" />
                </div>
            </FilterSection>

        </>
    );
}

export default function ProductsView() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category");
    const subcategoryParam = searchParams.get("subcategory");

    const pageTitle = subcategoryParam || categoryParam || "All Products";
    const pageDescription = subcategoryParam
        ? `Showing results for ${subcategoryParam}`
        : categoryParam
            ? `Browse all products in ${categoryParam}`
            : "Browse our complete collection of premium products";

    const [sortBy, setSortBy] = useState("default");
    const [gridView, setGridView] = useState("grid");
    const [openFilter, setOpenFilter] = useState("price");
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [priceMin, setPriceMin] = useState(0);
    const [priceMax, setPriceMax] = useState(9999999);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState([]);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [heroBannerImage, setHeroBannerImage] = useState(null);

    const { addToCart } = useCart();

    // Fetch products
    useEffect(() => {
        setLoading(true);
        let queryArgs = [];
        if (categoryParam) queryArgs.push(`category=${encodeURIComponent(categoryParam)}`);
        if (subcategoryParam) queryArgs.push(`subcategory=${encodeURIComponent(subcategoryParam)}`);
        queryArgs.push("limit=100");

        fetch(`/api/product?${queryArgs.join("&")}`)
            .then((r) => r.ok ? r.json() : Promise.reject(r.status))
            .then((data) => {
                const prods = data.products || [];
                setProducts(prods);
                if (prods.length > 0) {
                    const prices = prods.map((p) => p.price || 0);
                    setPriceMax(Math.max(...prices));
                }
            })
            .catch((err) => console.error("Failed to fetch products:", err))
            .finally(() => setLoading(false));
    }, [categoryParam, subcategoryParam]);

    // Fetch hero banner for the current top-level category
    useEffect(() => {
        const cat = categoryParam;
        if (!cat) { setHeroBannerImage(null); return; }
        fetch(`/api/category-banner?category=${encodeURIComponent(cat)}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data) => {
                setHeroBannerImage(data.banner?.image || null);
            })
            .catch(() => setHeroBannerImage(null));
    }, [categoryParam]);

    const toggleFilter = (key) => {
        setOpenFilter((prev) => (prev === key ? null : key));
    };

    const allBrands = useMemo(() => {
        const brands = products
            .map((p) => p.customFields?.brand || p.brand || p.category || "")
            .filter(Boolean);
        return [...new Set(brands)];
    }, [products]);

    const maxPriceLimit = useMemo(() => {
        if (products.length === 0) return 9999999;
        return Math.max(...products.map(p => p.price || 0));
    }, [products]);

    const availabilityOptions = ["In Stock", "Out of Stock"];

    const hasActiveFilters =
        selectedBrands.length > 0 ||
        selectedDiscount !== null ||
        selectedAvailability.length > 0 ||
        selectedCondition.length > 0 ||
        (products.length > 0 && (priceMax < maxPriceLimit || priceMin > 0));

    const resetAll = () => {
        setPriceMin(0);
        setPriceMax(maxPriceLimit);
        setSelectedBrands([]);
        setSelectedDiscount(null);
        setSelectedAvailability([]);
        setSelectedCondition([]);
    };

    const toggleItem = (list, setList, item) => {
        setList((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
    };

    const sortedProducts = useMemo(() => {
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
        sorted = sorted.filter((p) => p._regularPrice >= priceMin && p._regularPrice <= priceMax);
        if (selectedDiscount !== null) sorted = sorted.filter((p) => p._discountPct >= selectedDiscount);
        if (selectedAvailability.length > 0) {
            sorted = sorted.filter((p) => {
                if (selectedAvailability.includes("In Stock") && p._isInStock) return true;
                if (selectedAvailability.includes("Out of Stock") && !p._isInStock) return true;
                return false;
            });
        }
        if (selectedCondition.length > 0) {
            sorted = sorted.filter((p) => selectedCondition.includes(p.condition || p.customFields?.condition));
        }

        return sorted;
    }, [sortBy, selectedBrands, priceMin, priceMax, selectedDiscount, selectedAvailability, selectedCondition, products]);

    const filterContentProps = {
        openFilter, toggleFilter,
        priceMin, priceMax, setPriceMin, setPriceMax,
        allBrands, selectedBrands, setSelectedBrands,
        selectedDiscount, setSelectedDiscount,
        availabilityOptions, selectedAvailability, setSelectedAvailability,
        toggleItem, maxPriceLimit,
    };

    return (
        <>
            {/* Category Hero Banner */}
            <div className="relative w-full h-[106px] min-[480px]:h-[123px] min-[640px]:h-[141px] min-[768px]:h-[158px] min-[1024px]:h-[176px] overflow-hidden">
                {heroBannerImage ? (
                    <img
                        src={heroBannerImage}
                        alt={categoryParam || "Category"}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full"
                        style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d1f3d 40%, #B8860B 100%)" }}
                    />
                )}
            </div>

            {/* Heading below banner */}
            <div className="max-w-[1440px] mx-auto px-4 min-[480px]:px-6 min-[768px]:px-8 pt-5 min-[480px]:pt-6 min-[768px]:pt-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 min-[480px]:gap-2 text-[10px] min-[480px]:text-xs min-[768px]:text-sm text-text-muted mb-2 min-[480px]:mb-3">
                    <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
                    <ChevronRight size={12} className="min-[768px]:w-[14px] min-[768px]:h-[14px]" />
                    {categoryParam && subcategoryParam ? (
                        <>
                            <Link href={`/products?category=${encodeURIComponent(categoryParam)}`} className="hover:text-text-primary transition-colors">{categoryParam}</Link>
                            <ChevronRight size={12} className="min-[768px]:w-[14px] min-[768px]:h-[14px]" />
                            <span className="text-text-primary font-medium">{subcategoryParam}</span>
                        </>
                    ) : (
                        <span className="text-text-primary font-medium">{pageTitle}</span>
                    )}
                </div>
                <h1 className="text-xl min-[480px]:text-2xl min-[768px]:text-3xl font-semibold text-text-primary mb-1">{pageTitle}</h1>
                <p className="text-text-secondary text-[10px] min-[480px]:text-xs min-[768px]:text-sm max-w-lg">{pageDescription}</p>
            </div>

            <section className="max-w-[1440px] mx-auto px-2 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 py-6 min-[768px]:py-8">

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
                                className="fixed top-0 left-0 h-full w-[280px] min-[480px]:w-[300px] bg-white z-50 min-[768px]:hidden overflow-y-auto shadow-2xl"
                            >
                                <div className="flex items-center justify-between px-4 min-[480px]:px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                                    <span className="text-sm min-[480px]:text-base font-bold text-text-primary">Filter By</span>
                                    <div className="flex items-center gap-3">
                                        {hasActiveFilters && (
                                            <button onClick={resetAll} className="text-xs min-[480px]:text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                                                Reset
                                            </button>
                                        )}
                                        <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-3 min-[480px]:px-4 pb-8">
                                    <FilterContent {...filterContentProps} />
                                </div>
                                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 min-[480px]:p-4">
                                    <button
                                        onClick={() => setMobileFilterOpen(false)}
                                        className="w-full bg-black text-sm font-semibold py-3 rounded-lg transition-colors"
                                    >
                                        <span className="bg-gradient-to-r from-[#C4A265] via-[#D4B978] to-[#C4A265] bg-clip-text text-transparent">
                                            Show {sortedProducts.length} Products
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className="flex gap-3 min-[480px]:gap-4 min-[768px]:gap-6">
                    {/* Sidebar filters — desktop */}
                    <aside className="hidden min-[768px]:block w-48 min-[1024px]:w-56 min-[1280px]:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <span className="text-base font-bold text-text-primary">Filter By</span>
                                {hasActiveFilters && (
                                    <button onClick={resetAll} className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="px-4">
                                <FilterContent {...filterContentProps} />
                            </div>
                        </div>
                    </aside>

                    {/* Right content */}
                    <div className="flex-1 min-w-0">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 min-[480px]:gap-3 mb-4 min-[768px]:mb-6">
                            <div className="flex items-center gap-2 min-[480px]:gap-3">
                                <button
                                    onClick={() => setMobileFilterOpen(true)}
                                    className="min-[768px]:hidden flex items-center gap-1.5 min-[480px]:gap-2 bg-white border border-gray-200 text-[10px] min-[480px]:text-sm font-medium text-text-primary px-2 min-[480px]:px-3 py-1.5 min-[480px]:py-2 rounded-lg hover:border-purple-mid transition-colors"
                                >
                                    <SlidersHorizontal size={14} className="min-[480px]:w-4 min-[480px]:h-4" />
                                    Filters
                                    {hasActiveFilters && <span className="w-1.5 h-1.5 min-[480px]:w-2 min-[480px]:h-2 bg-purple-mid rounded-full" />}
                                </button>
                                <span className="text-[10px] min-[480px]:text-xs min-[768px]:text-sm text-text-muted">
                                    Showing <span className="font-semibold text-text-primary">{loading ? "..." : sortedProducts.length}</span> products
                                </span>
                            </div>

                            <div className="flex items-center gap-2 min-[480px]:gap-4">
                                <div className="flex items-center gap-1 min-[480px]:gap-2">
                                    <span className="text-xs min-[480px]:text-sm text-text-muted hidden min-[640px]:inline">Sort by:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-white border border-gray-200 text-[10px] min-[480px]:text-sm text-text-primary font-medium px-2 min-[480px]:px-3 py-1.5 min-[480px]:py-2 rounded-lg outline-none cursor-pointer hover:border-purple-mid focus:border-purple-mid transition-colors"
                                    >
                                        {sortOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 min-[480px]:p-1">
                                    <button
                                        onClick={() => setGridView("grid")}
                                        className={`p-1 min-[480px]:p-1.5 rounded-md transition-colors ${gridView === "grid" ? "bg-white shadow-sm text-purple-dark" : "text-text-muted"}`}
                                    >
                                        <Grid3X3 size={14} className="min-[480px]:w-4 min-[480px]:h-4" />
                                    </button>
                                    <button
                                        onClick={() => setGridView("list")}
                                        className={`p-1 min-[480px]:p-1.5 rounded-md transition-colors ${gridView === "list" ? "bg-white shadow-sm text-purple-dark" : "text-text-muted"}`}
                                    >
                                        <LayoutList size={14} className="min-[480px]:w-4 min-[480px]:h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Products */}
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="animate-spin text-purple-mid" size={32} />
                            </div>
                        ) : sortedProducts.length === 0 ? (
                            <div className="text-center py-20 flex flex-col justify-center items-center">
                                <p className="text-text-muted text-sm min-[480px]:text-base min-[768px]:text-lg mb-4">No products found for this query.</p>
                                {hasActiveFilters && (
                                    <button onClick={resetAll} className="text-xs min-[480px]:text-sm text-white bg-purple-mid hover:bg-purple-dark transition-colors px-4 min-[480px]:px-6 py-2 rounded-lg font-semibold">
                                        Clear all filters
                                    </button>
                                )}
                                {(!hasActiveFilters && (categoryParam || subcategoryParam)) && (
                                    <Link href="/products" className="text-xs min-[480px]:text-sm text-white bg-purple-mid hover:bg-purple-dark transition-colors px-4 min-[480px]:px-6 py-2 rounded-lg font-semibold mt-4">
                                        View All Products
                                    </Link>
                                )}
                            </div>
                        ) : gridView === "grid" ? (
                            <div className="grid grid-cols-2 min-[640px]:grid-cols-3 min-[768px]:grid-cols-2 min-[920px]:grid-cols-3 min-[1280px]:grid-cols-4 gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-4" style={{ overflow: "visible" }}>
                                {sortedProducts.map((product, i) => (
                                    <ProductCard key={String(product._id || product.id)} product={product} index={i} />
                                ))}
                            </div>
                        ) : (
                            /* List view */
                            <div className="space-y-2 min-[480px]:space-y-3 min-[768px]:space-y-4">
                                {sortedProducts.map((product, i) => {
                                    const productId = String(product._id || product.id);
                                    return (
                                        <motion.div
                                            key={productId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.03 }}
                                        >
                                            <Link href={`/product/${productId}`}>
                                                <div className="bg-white rounded-lg min-[480px]:rounded-xl overflow-hidden flex group hover:shadow-md transition-all duration-300">
                                                    <div className="relative w-24 min-[480px]:w-32 min-[768px]:w-48 h-28 min-[480px]:h-32 min-[768px]:h-44 bg-card-white flex-shrink-0 overflow-hidden">
                                                        {product.badge && (
                                                            <span className="absolute top-1.5 left-1.5 min-[480px]:top-2 min-[480px]:left-2 min-[768px]:top-3 min-[768px]:left-3 bg-purple-soft text-purple-mid text-[8px] min-[480px]:text-[9px] min-[768px]:text-[10px] font-semibold px-1.5 min-[480px]:px-2 min-[768px]:px-3 py-0.5 min-[768px]:py-1 rounded-full z-10">
                                                                {product.badge}
                                                            </span>
                                                        )}
                                                        <Image
                                                            src={product._image}
                                                            alt={product.name}
                                                            fill
                                                            className="object-contain group-hover:scale-105 transition-transform duration-500"
                                                            sizes="200px"
                                                        />
                                                    </div>
                                                    <div className="flex-1 p-2 min-[480px]:p-3 min-[768px]:p-5 flex flex-col justify-center min-w-0">
                                                        <p className="text-[8px] min-[480px]:text-[9px] min-[768px]:text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-0.5">{product._brand}</p>
                                                        <h3 className="text-[10px] min-[480px]:text-xs min-[768px]:text-base font-normal text-text-primary/85 mb-1 min-[768px]:mb-2 group-hover:text-purple-dark transition-colors line-clamp-2">
                                                            {product.name}
                                                        </h3>
                                                        <p className="text-[8px] min-[480px]:text-[10px] min-[768px]:text-sm text-text-secondary mb-1 min-[480px]:mb-2 min-[768px]:mb-3 line-clamp-1 min-[768px]:line-clamp-2 hidden min-[480px]:block">{product.description}</p>
                                                        {product._isInStock ? (
                                                            <div className="flex flex-wrap items-baseline gap-x-1 min-[480px]:gap-x-1.5 min-[768px]:gap-x-3">
                                                                <span className="text-[11px] min-[480px]:text-sm min-[768px]:text-xl font-semibold text-text-primary whitespace-nowrap">Tk {formatPrice(product._normalPrice)}</span>
                                                                {product._savedAmount > 0 && (
                                                                    <>
                                                                        <span className="text-[8px] min-[480px]:text-[10px] min-[768px]:text-sm text-text-muted line-through whitespace-nowrap">Tk {formatPrice(product._regularPrice)}</span>
                                                                        <span className="hidden min-[768px]:inline text-xs text-green-600 font-semibold whitespace-nowrap">Save Tk {formatPrice(product._savedAmount)}</span>
                                                                        <span className="bg-green-600 text-white text-[7px] min-[480px]:text-[8px] min-[768px]:text-[10px] font-bold px-1 min-[480px]:px-1.5 min-[768px]:px-2 py-0.5 rounded-full whitespace-nowrap">-{product._discountPct}%</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-block text-[8px] min-[480px]:text-[9px] min-[768px]:text-xs font-bold px-1.5 min-[768px]:px-3 py-0.5 min-[768px]:py-1.5 rounded-full bg-red-100 text-red-600 whitespace-nowrap">
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
        </>
    );
}
