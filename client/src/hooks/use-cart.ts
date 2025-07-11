import { useContext } from "react";
import { useCart as useCartFromProvider } from "@/components/cart-provider";

export function useCart() {
  return useCartFromProvider();
}
