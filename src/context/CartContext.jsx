"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShoppingCart } from "lucide-react";

const CartContext = createContext();

function CartToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className="fixed top-4 right-4 z-[9999] flex items-center gap-3 bg-[#111111] text-white pl-4 pr-5 py-3 rounded-xl shadow-lg shadow-black/30 border border-[#f26e21]/30 max-w-xs"
    >
      <CheckCircle2 size={20} className="text-[#ff8c42] flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("nishat-cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("nishat-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((productId, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { id: productId, qty }];
    });
    setToast({ id: Date.now(), message: "Added to cart successfully!" });
  }, []);

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQty = (productId, qty) => {
    if (qty < 1) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, qty } : item))
    );
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartCount }}>
      {children}
      <AnimatePresence>
        {toast && (
          <CartToast
            key={toast.id}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
