"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart();

  const productId = String(product._id || product.id);
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].url
      : product.image || "/placeholder.png";
  const regularPrice = product.price || 0;
  const salePrice =
    product.discount && product.discount > 0 && product.discount < regularPrice
      ? product.discount
      : regularPrice;
  const savedAmount = regularPrice - salePrice;
  const discountPercent = savedAmount > 0 ? Math.round((savedAmount / regularPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="relative rounded-2xl overflow-hidden group flex flex-col h-full"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {/* Glass shine overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(242,110,33,0.04) 100%)",
        }}
      />

      <Link href={`/product/${productId}`} className="flex-1 flex flex-col relative z-[1]">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100/50 m-1.5 min-[480px]:m-2 rounded-xl">
          {/* Discount badge */}
          {discountPercent > 0 && (
            <span className="absolute top-2 left-2 z-10 text-[9px] min-[480px]:text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, #ff5500, #f26e21)",
                boxShadow: "0 2px 8px rgba(242,110,33,0.35)",
              }}
            >
              -{discountPercent}%
            </span>
          )}

          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />

          {/* Bottom glass fade */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/30 to-transparent" />
        </div>

        {/* Info */}
        <div className="px-1.5 min-[480px]:px-2 pb-1.5 min-[480px]:pb-2 pt-1 flex-1 flex flex-col">
          {/* Name */}
          <h3 className="text-[11px] min-[480px]:text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 mb-2 min-h-[calc(2*1em*1.375)]">
            {product.name}
          </h3>

          {/* Price + Cart */}
          <div className="mt-auto flex items-center justify-between gap-1">
            <div className="flex flex-col min-w-0">
              <span className="text-xs min-[360px]:text-sm min-[480px]:text-[15px] font-bold text-gray-900 whitespace-nowrap">
                Tk {formatPrice(salePrice)}
              </span>
              {savedAmount > 0 && (
                <span className="text-[8px] min-[360px]:text-[10px] min-[480px]:text-[11px] text-gray-400 line-through whitespace-nowrap">
                  Tk {formatPrice(regularPrice)}
                </span>
              )}
            </div>

            {/* Add to Cart */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(productId);
              }}
              className="w-8 h-8 min-[480px]:w-9 min-[480px]:h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(242,110,33,0.12), rgba(242,110,33,0.06))",
                border: "1px solid rgba(242,110,33,0.2)",
                color: "#f26e21",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #f26e21, #e05e15)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.border = "1px solid #f26e21";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(242,110,33,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(242,110,33,0.12), rgba(242,110,33,0.06))";
                e.currentTarget.style.color = "#f26e21";
                e.currentTarget.style.border = "1px solid rgba(242,110,33,0.2)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <ShoppingCart size={15} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
