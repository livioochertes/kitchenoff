import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Truck, Shield, Award, Phone, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Header from "@/components/header";
import ProductCard from "@/components/product-card";
import type { Category, ProductWithCategory } from "@shared/schema";
import kitchenOffLogo from "@assets/KitchenOff_Logo_Background_Removed_1752520997429.png";

export default function Home() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: featuredProducts = [] } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", { featured: true, limit: 4 }],
  });

  const trustIndicators = [
    { icon: Truck, text: "Free Shipping Over $500" },
    { icon: Shield, text: "FDA Compliant Products" },
    { icon: Award, text: "Industry Certified" },
    { icon: Phone, text: "24/7 Support" },
    { icon: Users, text: "10,000+ Happy Customers" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Restaurant Manager",
      rating: 5,
      comment: "Excellent quality labels and fast shipping. Our restaurant has been using KitchenOff for over 2 years now. Highly recommended!",
    },
    {
      name: "Mike Chen",
      role: "Food Service Director",
      rating: 5,
      comment: "The B2B pricing has saved us hundreds of dollars. Great customer service and the products are exactly what we need for compliance.",
    },
    {
      name: "Lisa Rodriguez",
      role: "Cafe Owner",
      rating: 5,
      comment: "Professional quality equipment at competitive prices. The HACCP compliance kit was exactly what our cafe needed for inspection.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero Section */}
      <section className="hero-gradient text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Kitchen Equipment & Safety Solutions
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Trusted by restaurants, cafes, and food service professionals worldwide. From expiration labels to HACCP compliance materials.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="kitchen-pro-secondary">
                  Shop Now
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                Request B2B Quote
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-center">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="trust-indicator">
                <indicator.icon className="h-5 w-5" />
                <span className="text-sm text-slate-600">{indicator.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">Shop by Category</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Professional-grade kitchen supplies and safety equipment for restaurants, cafes, and food service businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.slice(0, 3).map((category) => (
              <Card key={category.id} className="category-card group cursor-pointer">
                <Link href={`/products?category=${category.slug}`}>
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      <img
                        src={category.imageUrl || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=300"}
                        alt={category.name}
                        className="category-image w-full h-48 object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-primary mb-2">{category.name}</h3>
                      <p className="text-slate-600 mb-4">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">50+ Products</span>
                        <Button variant="ghost" className="text-secondary hover:text-blue-600 p-0">
                          View All <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">Featured Products</h2>
            <p className="text-slate-600">Best-selling products trusted by food service professionals</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section className="py-16 bg-slate-100">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-primary mb-6">Business Solutions</h2>
                <p className="text-slate-600 mb-8">
                  Get wholesale pricing and dedicated support for your restaurant, cafe, or food service business. 
                  We offer bulk discounts, custom solutions, and priority shipping.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Wholesale pricing on bulk orders",
                    "Dedicated account manager",
                    "Priority shipping and support",
                    "Custom labeling and packaging",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-5 h-5 rounded-full kitchen-pro-accent flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="kitchen-pro-secondary">
                    Get B2B Quote
                  </Button>
                  <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-white">
                    Contact Sales
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300"
                  alt="Professional kitchen"
                  className="rounded-lg shadow-md"
                />
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300"
                  alt="Food safety equipment"
                  className="rounded-lg shadow-md"
                />
                <img
                  src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300"
                  alt="Kitchen storage"
                  className="rounded-lg shadow-md"
                />
                <img
                  src="https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300"
                  alt="Compliance materials"
                  className="rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">What Our Customers Say</h2>
            <p className="text-slate-600">Trusted by food service professionals across the country</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="kitchen-pro-muted">
                <CardContent className="p-6">
                  <div className="flex text-yellow-400 mb-4">
                    {Array.from({ length: testimonial.rating }, (_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4">{testimonial.comment}</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 font-semibold">
                        {testimonial.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-primary">{testimonial.name}</h4>
                      <p className="text-sm text-slate-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 kitchen-pro-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Stay Updated</h2>
            <p className="text-blue-100 mb-8">
              Get the latest products, safety tips, and exclusive offers delivered to your inbox.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-white"
              />
              <Button className="bg-white text-secondary hover:bg-slate-100">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="kitchen-pro-primary py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center">
                  <img 
                    src={kitchenOffLogo} 
                    alt="KitchenOff Logo" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-white">KitchenOff</span>
              </div>
              <p className="text-slate-300 mb-4">
                Professional kitchen equipment and safety solutions for food service businesses.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-300 hover:text-white transition-colors">
                  <i className="fab fa-facebook"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white transition-colors">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white transition-colors">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white transition-colors">
                  <i className="fab fa-linkedin"></i>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Products</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">B2B Solutions</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link href={`/products?category=${category.slug}`} className="text-slate-300 hover:text-white transition-colors">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Contact Info</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-secondary" />
                  <span className="text-slate-300">+1 (234) 567-8900</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-envelope text-secondary"></i>
                  <span className="text-slate-300">info@kitchenprosupply.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-map-marker-alt text-secondary"></i>
                  <span className="text-slate-300">123 Business Ave, Suite 100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-secondary"></i>
                  <span className="text-slate-300">Mon-Fri: 8AM-6PM EST</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700 mt-8 pt-8 text-center">
            <p className="text-slate-300">
              &copy; 2024 KitchenPro Supply. All rights reserved. | 
              <a href="#" className="hover:text-white ml-2">Privacy Policy</a> | 
              <a href="#" className="hover:text-white ml-2">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
