import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const { cart } = useCart();

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const cartItemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top Banner */}
      <div className="kitchen-pro-primary py-2">
        <div className="container mx-auto px-4 text-center text-sm">
          <span>Free shipping on orders over $500 • Professional support available</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 kitchen-pro-secondary rounded flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="text-xl font-bold text-primary">KitchenPro Supply</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </form>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <User className="h-4 w-4 mr-2" />
                Account
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 mt-4">
                  <form onSubmit={handleSearch} className="flex">
                    <div className="relative w-full">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10"
                      />
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </form>
                  <Link href="/products">
                    <Button variant="ghost" className="w-full justify-start">
                      All Products
                    </Button>
                  </Link>
                  {categories?.map((category: any) => (
                    <Link key={category.id} href={`/products?category=${category.slug}`}>
                      <Button variant="ghost" className="w-full justify-start">
                        {category.name}
                      </Button>
                    </Link>
                  ))}
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="kitchen-pro-muted py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/products">
                <Button variant="ghost" className="font-medium">
                  All Categories
                </Button>
              </Link>
              {categories?.slice(0, 4).map((category: any) => (
                <Button 
                  key={category.id} 
                  variant="ghost" 
                  className="font-medium hidden lg:block" 
                  onClick={() => {
                    window.location.href = `/products?category=${category.slug}`;
                  }}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Need help?</span>
              <a href="tel:+1234567890" className="text-sm text-secondary font-medium">
                Call: +1 (234) 567-8900
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
