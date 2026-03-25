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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="bg-card-white rounded-xl overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.15),0_0px_20px_rgba(255,255,255,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_24px_rgba(242,110,33,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
    >
      <Link href={`/product/${productId}`} className="flex-1 flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-offwhite overflow-hidden">
          {savedAmount > 0 && (
            <span className="absolute top-2 left-2 bg-[#ff5500] text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
              -{Math.round((savedAmount / regularPrice) * 100)}%
            </span>
          )}
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </div>

        {/* Info */}
        <div className="p-2.5 min-[480px]:p-3 flex-1 flex flex-col">
          {/* Name */}
          <h3 className="text-xs min-[480px]:text-[13px] font-medium text-text-primary leading-snug line-clamp-2 mb-1.5">
            {product.name}
          </h3>

          {/* Price */}
          <div className="mt-auto flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1 min-[480px]:gap-1.5 min-w-0 overflow-hidden">
              <span className="text-xs min-[360px]:text-sm min-[480px]:text-[15px] font-bold text-[#f26e21] whitespace-nowrap">
                Tk {formatPrice(salePrice)}
              </span>
              {savedAmount > 0 && (
                <span className="text-[8px] min-[360px]:text-[10px] min-[480px]:text-xs text-text-muted line-through whitespace-nowrap truncate">
                  Tk {formatPrice(regularPrice)}
                </span>
              )}
            </div>

            {/* Add to Cart icon */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(productId);
              }}
              className="w-9 h-9 min-[480px]:w-10 min-[480px]:h-10 rounded-full bg-gradient-to-b from-[#f26e21] to-[#e05e15] text-white hover:w-11 hover:h-11 min-[480px]:hover:w-12 min-[480px]:hover:h-12 flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-[0_3px_10px_rgba(242,110,33,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_5px_16px_rgba(242,110,33,0.55),inset_0_1px_1px_rgba(255,255,255,0.2)] active:translate-y-[1px]"
            >
              <ShoppingCart size={17} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
