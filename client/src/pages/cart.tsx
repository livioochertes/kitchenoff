import { Link } from "wouter";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import Header from "@/components/header";

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch shipping settings
  const { data: shippingSettings } = useQuery({
    queryKey: ['/api/shipping-settings'],
    queryFn: async () => {
      const response = await fetch('/api/shipping-settings');
      if (!response.ok) throw new Error('Failed to fetch shipping settings');
      return response.json();
    },
  });

  // Filter out items without product data
  const validCart = cart.filter(item => item.product && item.product.price);

  const subtotal = validCart.reduce((sum, item) => {
    return sum + (parseFloat(item.product.price) * item.quantity);
  }, 0);
  
  const freeShippingThreshold = shippingSettings ? parseFloat(shippingSettings.freeShippingThreshold) : 500;
  const standardShippingCost = shippingSettings ? parseFloat(shippingSettings.standardShippingCost) : 25;
  const currency = shippingSettings?.currency || 'EUR';
  
  const shipping = subtotal > freeShippingThreshold ? 0 : standardShippingCost;
  const total = subtotal + shipping;

  // Currency symbol helper
  const getCurrencySymbol = (curr: string) => {
    const symbols = { 'EUR': '€', 'RON': 'lei', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };
  
  const currencySymbol = getCurrencySymbol(currency);

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: number, productName: string) => {
    removeFromCart(itemId);
    toast({
      title: "Removed from cart",
      description: `${productName} has been removed from your cart.`,
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-primary">Shopping Cart</h1>
          {validCart.length > 0 && (
            <Button variant="outline" onClick={handleClearCart}>
{t('cart.clear')}
            </Button>
          )}
        </div>

        {validCart.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Add some products to your cart to get started
              </p>
              <Link href="/products">
                <Button size="lg" className="kitchen-pro-secondary">
                  {t('cart.continueShopping')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {validCart.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product?.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"}
                        alt={item.product?.name || "Product"}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary mb-1">
                          {item.product?.name || "Unknown Product"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          ${item.product?.price ? parseFloat(item.product.price).toFixed(2) : "0.00"} each
                        </p>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= (item.product?.stockQuantity || 0)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">
                              ${item.product?.price ? (parseFloat(item.product.price) * item.quantity).toFixed(2) : "0.00"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id, item.product?.name || "Unknown Product")}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({cart.length} items):</span>
                    <span>{subtotal.toFixed(2)} {currencySymbol}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>
                      {shipping === 0 ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        `${shipping.toFixed(2)} ${currencySymbol}`
                      )}
                    </span>
                  </div>
                  
                  {subtotal < freeShippingThreshold && (
                    <div className="text-sm text-muted-foreground">
                      Add {(freeShippingThreshold - subtotal).toFixed(2)} {currencySymbol} more for free shipping
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>{total.toFixed(2)} {currencySymbol}</span>
                  </div>
                  
                  <Link href="/checkout">
                    <Button size="lg" className="w-full kitchen-pro-secondary">
                      {t('cart.checkout')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <Link href="/products">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
