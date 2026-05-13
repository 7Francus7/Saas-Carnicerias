import { memo } from "react";
import { formatCurrency, formatNumber } from "@/lib/constants";
import type { Product } from "@/stores/useProductsStore";

interface ProductCardProps {
  product: Product;
  isOutOfStock: boolean;
  availableStock: number | null;
  stockUnit: string;
  stockAlertThreshold: number;
  discountPrice: number | null;
  onClick: () => void;
}

function ProductCardInner({
  product,
  isOutOfStock,
  availableStock,
  stockUnit,
  stockAlertThreshold,
  discountPrice,
  onClick,
}: ProductCardProps) {
  return (
    <div
      className="pos-card"
      onClick={onClick}
      style={
        isOutOfStock
          ? { opacity: 0.6, cursor: "not-allowed" }
          : undefined
      }
    >
      <div className="pos-card__emoji-wrap">
        <div className="pos-card__emoji">{product.emoji}</div>
      </div>
      <div className="pos-card__name">{product.name}</div>
      <div className="pos-card__price">
        {discountPrice !== null ? (
          <>
            <span style={{ textDecoration: "line-through", color: "var(--text-muted)", marginRight: 6, fontSize: "0.78rem" }}>
              {formatCurrency(product.price)}
            </span>
            <span style={{ color: "var(--danger)", fontWeight: 800 }}>
              {formatCurrency(discountPrice)}
            </span>
          </>
        ) : (
          formatCurrency(product.price)
        )}
        <span className="pos-card__unit">/{product.unit}</span>
      </div>
      {product.discountPercent && product.discountPercent > 0 && (
        <div className="pos-card__promo">{product.discountPercent}% OFF</div>
      )}
      <div className="pos-card__plu">PLU {product.plu}</div>
      {availableStock !== null && (
        <div
          style={{
            marginTop: 8,
            fontSize: "0.72rem",
            fontWeight: 700,
            color:
              availableStock <= 0
                ? "var(--danger)"
                : availableStock <= stockAlertThreshold
                  ? "var(--warning)"
                  : "var(--success)",
          }}
        >
          Stock: {formatNumber(Math.max(0, availableStock))} {stockUnit}
        </div>
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardInner);
