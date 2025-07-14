import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Star, ShoppingCart, Truck, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/header";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { ProductWithCategory, Review } from "@shared/schema";

export default function ProductDetails() {
  const [, params] = useRoute("/products/:slug");
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<ProductWithCategory>({
    queryKey: [`/api/products/slug/${params?.slug}`],
    enabled: !!params?.slug,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/products", product?.id, "reviews"],
    enabled: !!product?.id,
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart(product.id, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Product not found</p>
            <Link href="/products">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary">Products</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-primary">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden">
              <img
                src={product.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=800"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <Badge variant="secondary" className="mb-2">
                  {product.category.name}
                </Badge>
              )}
              <h1 className="text-3xl font-bold text-primary mb-4">{product.name}</h1>
              
              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex">
                  {renderStars(parseFloat(product.rating || "0"))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-3xl font-bold text-primary">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${parseFloat(product.compareAtPrice).toFixed(2)}
                  </span>
                )}
                {product.compareAtPrice && (
                  <Badge variant="destructive">
                    Save ${(parseFloat(product.compareAtPrice) - parseFloat(product.price)).toFixed(2)}
                  </Badge>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.inStock ? (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                    <span>In Stock ({product.stockQuantity || 0} available)</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                    <span>Out of Stock</span>
                  </div>
                )}
              </div>

              {/* Add to Cart */}
              <Button
                size="lg"
                className="w-full kitchen-pro-secondary mb-6"
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>

              {/* Trust Badges */}
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-1" />
                  <span>Free shipping over $500</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  <span>FDA compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-8">
              <Card>
                <CardContent className="p-8">
                  <div className="prose max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {product.description || "No description available for this product."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="mt-8">
              <Card>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Product Details</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">SKU:</dt>
                          <dd className="font-medium">KP-{product.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Category:</dt>
                          <dd className="font-medium">{product.category?.name || "N/A"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Stock:</dt>
                          <dd className="font-medium">{product.stockQuantity || 0} units</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Compliance</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">FDA Approved:</dt>
                          <dd className="font-medium text-green-600">Yes</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">HACCP Compatible:</dt>
                          <dd className="font-medium text-green-600">Yes</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Food Safe:</dt>
                          <dd className="font-medium text-green-600">Yes</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <Card>
                <CardContent className="p-8">
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.createdAt || "").toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                          <Separator />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
