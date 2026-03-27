"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, ShoppingCart, ChevronDown, ChevronRight, X, User, LogOut, Menu, Home, TrendingUp, HeadphonesIcon, Info, Tag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import Swal from "sweetalert2";

// Convert a category name to a URL-friendly slug
function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Animated logo text — typewriter effect: types out then erases, loops
function AnimatedLogo({ className = "text-xl", color = "text-purple-dark" }) {
  const text = "ZenTech";
  const [displayCount, setDisplayCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typeSpeed = isDeleting ? 80 : 150;
    const pauseAtEnd = 2000;
    const pauseAtStart = 500;

    if (!isDeleting && displayCount === text.length) {
      const t = setTimeout(() => setIsDeleting(true), pauseAtEnd);
      return () => clearTimeout(t);
    }
    if (isDeleting && displayCount === 0) {
      const t = setTimeout(() => setIsDeleting(false), pauseAtStart);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setDisplayCount((c) => c + (isDeleting ? -1 : 1));
    }, typeSpeed);
    return () => clearTimeout(t);
  }, [displayCount, isDeleting]);

  return (
    <span className={`${className} tracking-tight font-semibold ${color} inline-flex items-baseline`} style={{ minWidth: "5.5ch" }}>
      {text.slice(0, displayCount)}
      <motion.span
        className="inline-block w-[2px] ml-[1px] bg-current rounded-full"
        style={{ height: "1em" }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
      />
    </span>
  );
}

const navLinks = [
  { label: "Brands", href: "/brands" },
  { label: "Trending", href: "/trending" },
  { label: "Support", href: "/support" },
  { label: "About Us", href: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, userRole } = useAuth();
  const [showCategories, setShowCategories] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const searchRef = useRef(null);
  const { cartCount } = useCart();

  // Fetch categories from DB, keep fallback if it fails
  useEffect(() => {
    fetch("/api/category")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        const dbCats = data.categories || [];
        if (dbCats.length > 0) setCategories(dbCats);
      })
      .catch(() => {
        // Keep fallback categories (already set as initial state)
      });
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have been successfully logged out',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#f26e21',
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Logout Failed',
        text: 'Failed to log out. Please try again.',
        confirmButtonColor: '#f26e21',
      });
    } finally {
      setSigningOut(false);
    }
  };

  // Bottom bar items
  const bottomBarItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Trending", href: "/trending", icon: TrendingUp },
    { label: "Cart", href: "/cart", icon: ShoppingCart, badge: cartCount },
    { label: user ? "Account" : "Login", href: user ? null : "/login", icon: User, isUser: true },
  ];

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP NAVBAR (md and up) — unchanged
         ═══════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/">
            <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f26e21] to-[#111111] flex items-center justify-center">
                <span className="text-white font-bold text-xs">Z</span>
              </div>
              <AnimatedLogo className="text-xl" color="text-gray-900" />
            </motion.div>
          </Link>

          {/* Nav Links */}
          <ul className="flex items-center gap-8">
            {/* ALL CATEGORIES with dropdown */}
            <li
              className="relative"
              onMouseEnter={() => setShowCategories(true)}
              onMouseLeave={() => { setShowCategories(false); setActiveCategory(null); }}
            >
              <button className={`flex items-center gap-1.5 text-sm font-semibold transition-colors relative pb-0.5 ${pathname.startsWith("/products") ? "text-[#f26e21]" : "text-gray-700 hover:text-[#f26e21]"
                }`}>
                All Categories
                <ChevronDown size={14} className={`transition-transform duration-200 ${showCategories ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showCategories && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 pt-3 z-50"
                  >
                    <div className="flex bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                      {/* Parent categories */}
                      <div className="w-64 py-2 border-r border-gray-100">
                        {categories.map((cat, i) => (
                          <Link
                            key={String(cat._id || cat.name)}
                            href={`/products?category=${encodeURIComponent(cat.name)}`}
                            onMouseEnter={() => setActiveCategory(i)}
                            onClick={() => { setShowCategories(false); setActiveCategory(null); }}
                            className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${activeCategory === i
                              ? "bg-purple-soft text-purple-dark"
                              : "text-text-primary hover:bg-gray-50"
                              }`}
                          >
                            <span className="text-sm">{cat.name}</span>
                            <ChevronRight size={14} className="text-text-muted" />
                          </Link>
                        ))}
                      </div>

                      {/* Subcategories */}
                      <AnimatePresence mode="wait">
                        {activeCategory !== null && (
                          <motion.div
                            key={activeCategory}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.15 }}
                            className="w-56 py-2"
                          >
                            <Link
                              href={`/products?category=${encodeURIComponent(categories[activeCategory].name)}`}
                              onClick={() => { setShowCategories(false); setActiveCategory(null); }}
                              className="block px-5 py-2 text-[11px] font-semibold text-purple-mid uppercase tracking-wider hover:text-purple-dark transition-colors"
                            >
                              View All {categories[activeCategory].name}
                            </Link>
                            {(categories[activeCategory].subcategories || []).map((sub) => (
                              <Link
                                key={String(sub._id || sub.name)}
                                href={`/products?subcategory=${encodeURIComponent(sub.name)}`}
                                onClick={() => { setShowCategories(false); setActiveCategory(null); }}
                                className="block px-5 py-2.5 text-sm text-text-secondary hover:text-purple-dark hover:bg-purple-soft/40 transition-colors"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>

            {/* Other nav links */}
            {navLinks.map((link, i) => {
              const isActive = link.href !== "#" && pathname === link.href;
              return (
                <motion.li
                  key={link.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 + 0.3 }}
                  className="relative"
                >
                  <Link
                    href={link.href}
                    className={`text-sm font-semibold transition-colors pb-0.5 ${isActive ? "text-[#f26e21]" : "text-gray-700 hover:text-[#f26e21]"
                      }`}
                  >
                    {link.label}
                  </Link>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f26e21] rounded-full" />
                  )}
                </motion.li>
              );
            })}
          </ul>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user ? (
              /* User Menu */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#f26e21] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  {userRole === 'admin' && (
                    <span className="px-2 py-0.5 bg-[#f26e21] text-white text-[10px] font-bold rounded-full">
                      ADMIN
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-text-primary">
                          {user.displayName || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                        {userRole === 'admin' && (
                          <Link
                            href="/admin"
                            className="inline-block mt-2 px-2 py-1 bg-[#f26e21] text-white text-[10px] font-bold rounded-full"
                          >
                            Admin Panel
                          </Link>
                        )}
                      </div>
                      <div className="py-2">
                        {userRole === 'admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 hover:text-purple-mid transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User size={18} />
                            Admin Dashboard
                          </Link>
                        )}
                      </div>
                      <div className="py-2 border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          disabled={signingOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {signingOut ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <LogOut size={18} />
                          )}
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Login Button */
              <Link href="/login" className="relative text-sm font-semibold px-4 py-1.5 rounded-full bg-[#f26e21] hover:bg-[#e05e15] transition-all group shadow-[0_2px_8px_rgba(242,110,33,0.35)] border border-[#f26e21]/40">
                <span className="text-white">
                  Login / Register
                </span>
              </Link>
            )}

            <div className="flex items-center gap-4 ml-3">
              <div className="relative flex items-center">
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 pl-3 pr-1 py-1.5">
                        <Search size={14} className="text-gray-400 flex-shrink-0" />
                        <input
                          ref={searchRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search products..."
                          className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none ml-2"
                          onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                        />
                        <button
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                          className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!searchOpen && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchOpen(true)}
                    className="text-gray-700 hover:text-[#f26e21] transition-colors"
                  >
                    <Search size={22} />
                  </motion.button>
                )}
              </div>
              <Link href="/cart">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="relative text-gray-700 hover:text-[#f26e21] transition-colors">
                  <ShoppingCart size={22} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-purple-mid text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════════
          MOBILE TOP BAR (below md)
         ═══════════════════════════════════════════ */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center px-4 py-3 gap-3">
          {/* Hamburger — always visible */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-gray-700 hover:text-[#f26e21] transition-colors flex-shrink-0"
          >
            <Menu size={24} />
          </button>

          {/* Center area — logo or search */}
          <div className="flex-1 flex justify-center">
            <AnimatePresence mode="wait">
              {searchOpen ? (
                <motion.div
                  key="search-bar"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden w-full"
                >
                  <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 pl-3 pr-1 py-2">
                    <Search size={16} className="text-gray-400 flex-shrink-0" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none ml-2"
                      onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                    />
                    <button
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                      className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f26e21] to-[#111111] flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">Z</span>
                    </div>
                    <AnimatedLogo className="text-lg" color="text-gray-900" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search icon — toggles search, hidden when search is open */}
          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-gray-700 hover:text-[#f26e21] transition-colors flex-shrink-0"
            >
              <Search size={22} />
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE SIDEBAR (category menu)
         ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] md:hidden overflow-y-auto"
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f26e21] to-[#111111] flex items-center justify-center">
                    <span className="text-white font-bold text-[10px]">Z</span>
                  </div>
                  <AnimatedLogo className="text-lg" color="text-purple-dark" />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              {/* User info (if logged in) */}
              {user && (
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#f26e21] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user.displayName || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-block mt-2 px-2 py-1 bg-[#f26e21] text-white text-[10px] font-bold rounded-full"
                    >
                      Admin Panel
                    </Link>
                  )}
                </div>
              )}

              {/* Categories */}
              <div className="py-2">
                <p className="px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Categories</p>
                {categories.map((cat, i) => (
                  <div key={String(cat._id || cat.name)}>
                    <button
                      onClick={() => setExpandedMobileCategory(expandedMobileCategory === i ? null : i)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${expandedMobileCategory === i ? "text-purple-mid font-semibold bg-purple-soft/30" : "text-text-primary hover:bg-gray-50"
                        }`}
                    >
                      {cat.name}
                      <ChevronDown
                        size={16}
                        className={`text-text-muted transition-transform duration-200 ${expandedMobileCategory === i ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedMobileCategory === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-gray-50/50"
                        >
                          <Link
                            href={`/products?category=${encodeURIComponent(cat.name)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-6 py-2.5 text-xs font-semibold text-purple-mid uppercase tracking-wider hover:text-purple-dark transition-colors"
                          >
                            View All {cat.name}
                          </Link>
                          {(cat.subcategories || []).map((sub) => (
                            <Link
                              key={String(sub._id || sub.name)}
                              href={`/products?subcategory=${encodeURIComponent(sub.name)}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-6 py-2.5 text-sm text-text-secondary hover:text-purple-dark hover:bg-purple-soft/30 transition-colors"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Other links */}
              <div className="border-t border-gray-100 py-2">
                <p className="px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">More</p>
                <Link
                  href="/brands"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === "/brands" || pathname.startsWith("/brands/") ? "text-purple-mid font-semibold" : "text-text-primary hover:bg-gray-50"
                    }`}
                >
                  <Tag size={18} className="text-text-muted" />
                  Brands
                </Link>
                <Link
                  href="/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === "/support" ? "text-purple-mid font-semibold" : "text-text-primary hover:bg-gray-50"
                    }`}
                >
                  <HeadphonesIcon size={18} className="text-text-muted" />
                  Support
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === "/about" ? "text-purple-mid font-semibold" : "text-text-primary hover:bg-gray-50"
                    }`}
                >
                  <Info size={18} className="text-text-muted" />
                  About Us
                </Link>
              </div>

              {/* Login/Logout at bottom of sidebar */}
              <div className="border-t border-gray-100 py-2">
                {user ? (
                  <button
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {signingOut ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <LogOut size={18} />
                    )}
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-purple-mid hover:bg-purple-soft/30 transition-colors"
                  >
                    <User size={18} />
                    Login / Register
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          MOBILE BOTTOM BAR (fixed)
         ═══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around py-2">
          {bottomBarItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href && pathname === item.href;
            const isUserBtn = item.isUser;

            if (isUserBtn && user) {
              return (
                <button
                  key={item.label}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
                >
                  <div className="relative">
                    <div className="w-6 h-6 bg-[#f26e21] rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-[#f26e21]">Account</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href || "/login"}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 relative transition-colors ${isActive ? "text-[#f26e21]" : "text-gray-400"
                  }`}
              >
                <div className="relative">
                  <Icon size={22} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#f26e21] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-[#f26e21]" : "text-gray-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Mobile user menu popup (above bottom bar) */}
        <AnimatePresence>
          {userMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-2 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-text-primary">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
              {userRole === 'admin' && (
                <div className="py-1">
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 hover:text-purple-mid transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={18} />
                    Admin Dashboard
                  </Link>
                </div>
              )}
              <div className="py-1 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {signingOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <LogOut size={18} />
                  )}
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </>
  );
}
