import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Filter, Grid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import ProductCard from "@/components/product-card";
import type { Category, ProductWithCategory } from "@shared/schema";

export default function Products() {
  const [location] = useLocation();
  
  // Parse URL parameters using window.location for reliability
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("search") || "";
  const selectedCategory = urlParams.get("category") || "";
  
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  console.log("Products page rendered with:", { location, searchQuery, selectedCategory });
  console.log("Window location search:", window.location.search);
  console.log("URL search params:", urlParams.toString());
  console.log("All URL params:", Object.fromEntries(urlParams.entries()));

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", { 
      search: searchQuery || undefined,
      categorySlug: selectedCategory || undefined,
      limit: 50
    }],
  });

  console.log("Query params sent to API:", { 
    search: searchQuery || undefined,
    categorySlug: selectedCategory || undefined,
    limit: 50
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newSearch = formData.get("search") as string;
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (selectedCategory) params.set("category", selectedCategory);
    const newUrl = `/products${params.toString() ? `?${params.toString()}` : ""}`;
    window.location.href = newUrl;
  };

  // No need for client-side filtering since server handles it
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-desc":
        return parseFloat(b.price) - parseFloat(a.price);
      case "name":
        return a.name.localeCompare(b.name);
      case "rating":
        return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      default:
        return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-1/4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </h3>

                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="mb-6">
                  <div className="relative">
                    <Input
                      name="search"
                      type="text"
                      placeholder="Search products..."
                      defaultValue={searchQuery}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </form>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Categories</h4>
                  <div className="space-y-2">
                    <Button
                      variant={selectedCategory === "" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (searchQuery) params.set("search", searchQuery);
                        const newUrl = `/products${params.toString() ? `?${params.toString()}` : ""}`;
                        window.location.href = newUrl;
                      }}
                    >
                      All Products
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.slug ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (searchQuery) params.set("search", searchQuery);
                          params.set("category", category.slug);
                          const newUrl = `/products?${params.toString()}`;
                          window.location.href = newUrl;
                        }}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h4 className="font-medium mb-3">Sort By</h4>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="w-full lg:w-3/4">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-primary">
                  {selectedCategory
                    ? categories.find(c => c.slug === selectedCategory)?.name || "Products"
                    : searchQuery
                    ? `Search Results for "${searchQuery}"`
                    : "All Products"
                  }
                </h1>
                <Badge variant="secondary">
                  {sortedProducts.length} products
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            )}

            {/* No Results */}
            {!isLoading && sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No products found matching your criteria.</p>
                <Button onClick={() => { setSearchQuery(""); setSelectedCategory(""); }}>
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Products Grid */}
            {!isLoading && sortedProducts.length > 0 && (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              }`}>
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
