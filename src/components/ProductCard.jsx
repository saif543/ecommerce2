"use client";
// Shared product card used across homepage and products page

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart();

  const productId = String(product._id || product.id);
  const brandName = product.customFields?.brand || product.category || product.brand || "";
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
  const isAvailable = product.stock === "In Stock" || product.stock === "in_stock";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -8, rotateX: 2, rotateY: -1 }}
      style={{ transformPerspective: 800 }}
      className="bg-card-white rounded-lg min-[480px]:rounded-xl overflow-hidden group shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(15,52,96,0.22)] transition-all duration-300 flex flex-col"
    >
      <Link href={`/product/${productId}`} className="flex-1 flex flex-col">
        {/* Image */}
        <div className="relative h-36 sm:h-44 lg:h-56 bg-offwhite overflow-hidden">
          {product.badge && (
            <span className="absolute top-1.5 left-1.5 min-[480px]:top-2 min-[480px]:left-2 min-[768px]:top-3 min-[768px]:left-3 bg-purple-soft text-purple-mid text-[10px] min-[480px]:text-[10px] min-[768px]:text-[10px] font-semibold px-2 min-[480px]:px-2 min-[768px]:px-3 py-0.5 min-[768px]:py-1 rounded-full z-10">
              {product.badge}
            </span>
          )}
          {savedAmount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-[480px]:top-2 min-[480px]:right-2 min-[768px]:top-3 min-[768px]:right-3 bg-green-600 text-white text-[10px] min-[480px]:text-[10px] min-[768px]:text-[10px] font-bold px-1.5 min-[480px]:px-1.5 min-[768px]:px-2.5 py-0.5 min-[768px]:py-1 rounded-full z-10">
              Save Tk {formatPrice(savedAmount)}
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
        <div className="p-2 min-[480px]:p-3 min-[768px]:p-4 flex-1 flex flex-col text-center min-[480px]:text-left">
          <p className="text-[10px] min-[480px]:text-[10px] min-[768px]:text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-0.5 truncate">{brandName}</p>
          <h3 className="text-xs min-[480px]:text-xs min-[768px]:text-sm font-medium min-[768px]:font-normal text-text-primary/85 mb-1 min-[480px]:mb-2 min-[768px]:mb-3 leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="mt-auto">
            {isAvailable ? (
              <div className="flex flex-wrap items-baseline justify-center min-[480px]:justify-start gap-x-1 min-[480px]:gap-x-1.5 min-[768px]:gap-x-2 mb-1 min-[480px]:mb-2 min-[768px]:mb-3">
                <span className="text-sm min-[480px]:text-sm min-[768px]:text-lg font-bold min-[768px]:font-semibold text-text-primary whitespace-nowrap">
                  Tk {formatPrice(salePrice)}
                </span>
                {savedAmount > 0 && (
                  <span className="text-[10px] min-[480px]:text-[10px] min-[768px]:text-xs text-text-muted line-through whitespace-nowrap">
                    Tk {formatPrice(regularPrice)}
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-block text-[10px] min-[480px]:text-[10px] min-[768px]:text-xs font-bold px-1.5 min-[768px]:px-3 py-0.5 min-[768px]:py-1.5 rounded-full mb-1 min-[768px]:mb-3 bg-red-100 text-red-600 whitespace-nowrap">
                {product.stock === "out_of_stock" ? "Out of Stock" : product.stock}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-2 pb-2 min-[480px]:px-3 min-[480px]:pb-3 min-[768px]:px-4 min-[768px]:pb-4 mt-auto">
        {isAvailable ? (
          <div className="flex items-center gap-1 min-[480px]:gap-1.5 min-[768px]:gap-2">
            <Link href={`/product/${productId}`} className="w-[35%] min-[768px]:w-[38%] border border-purple-mid text-purple-mid hover:bg-purple-soft text-[9px] min-[425px]:text-[11px] min-[480px]:text-[11px] min-[768px]:text-xs font-bold min-[768px]:font-semibold py-2 min-[480px]:py-2.5 min-[768px]:py-3 rounded min-[480px]:rounded-md transition-colors text-center whitespace-nowrap tracking-normal">
              VIEW
            </Link>
            <button onClick={() => addToCart(productId)} className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#16213e] via-[#1a1a2e] to-[#0f3460] hover:from-[#1e2d4f] hover:via-[#1a1a2e] hover:to-[#0f3460] text-[9px] min-[425px]:text-[11px] min-[480px]:text-[11px] min-[768px]:text-xs font-bold min-[768px]:font-semibold py-2 min-[480px]:py-2.5 min-[768px]:py-3 rounded min-[480px]:rounded-md transition-all whitespace-nowrap tracking-normal shadow-[0_2px_4px_rgba(15,52,96,0.4),inset_0_1px_0_rgba(63,114,175,0.15)] active:shadow-[0_0px_1px_rgba(15,52,96,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)] active:translate-y-[1px] border border-[rgba(63,114,175,0.15)]">
              <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-[rgba(15,52,96,0.15)] to-transparent rounded-t pointer-events-none"></span>
              <span className="relative text-white">ADD TO CART</span>
            </button>
          </div>
        ) : (
          <button className="w-full bg-gray-300 text-gray-500 text-[10px] min-[480px]:text-[10px] min-[768px]:text-xs font-bold min-[768px]:font-semibold py-1.5 min-[480px]:py-2 min-[768px]:py-2.5 rounded min-[480px]:rounded-md cursor-not-allowed whitespace-nowrap tracking-wide min-[768px]:tracking-normal" disabled>
            {product.stock === "out_of_stock" ? "Out of Stock" : product.stock}
          </button>
        )}
      </div>
    </motion.div>
  );
}
