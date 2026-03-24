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
      className="bg-card-white rounded-xl overflow-hidden group shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)] transition-all duration-300 flex flex-col"
    >
      <Link href={`/product/${productId}`} className="flex-1 flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-offwhite overflow-hidden">
          {savedAmount > 0 && (
            <span className="absolute top-2 left-2 bg-[#E91E8C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
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
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm min-[480px]:text-[15px] font-bold text-[#F59E0B]">
                Tk {formatPrice(salePrice)}
              </span>
              {savedAmount > 0 && (
                <span className="text-[10px] min-[480px]:text-xs text-text-muted line-through">
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
              className="w-8 h-8 min-[480px]:w-9 min-[480px]:h-9 rounded-full bg-purple-dark hover:bg-purple-mid text-white flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ShoppingCart size={14} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
