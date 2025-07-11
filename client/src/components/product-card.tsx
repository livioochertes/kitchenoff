import { Link } from "wouter";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import type { ProductWithCategory } from "@shared/schema";

interface ProductCardProps {
  product: ProductWithCategory;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product.id, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <Card className="product-card group cursor-pointer hover:shadow-lg transition-shadow duration-300 h-full">
      <Link href={`/products/${product.slug}`}>
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative overflow-hidden">
            <img
              src={product.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300"}
              alt={product.name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.compareAtPrice && (
              <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                Sale
              </Badge>
            )}
            {product.featured && (
              <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
                Featured
              </Badge>
            )}
          </div>
          
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base">{product.name}</h3>
              
              {product.category && (
                <Badge variant="secondary" className="mb-3 text-xs">
                  {product.category.name}
                </Badge>
              )}
              
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mr-2">
                  {renderStars(parseFloat(product.rating || "0"))}
                </div>
                <span className="text-sm text-gray-500">
                  ({product.reviewCount || 0} reviews)
                </span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-emerald-600">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ${parseFloat(product.compareAtPrice).toFixed(2)}
                  </span>
                )}
                {product.compareAtPrice && (
                  <Badge variant="destructive" className="text-xs">
                    Save ${(parseFloat(product.compareAtPrice) - parseFloat(product.price)).toFixed(2)}
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              
              {!product.inStock && (
                <Badge variant="destructive" className="w-full text-center">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
