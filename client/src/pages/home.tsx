import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Truck, Shield, Award, MessageSquare, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import Header from "@/components/header";
import ProductCard from "@/components/product-card";
import ContactModal from "@/components/contact-modal";
import type { Category, ProductWithCategory } from "@shared/schema";
import kitchenOffLogo from "@assets/KitchenOff_Logo_Background_Removed_1752520997429.png";

export default function Home() {
  const { t } = useTranslation();
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: featuredProducts = [] } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", { featured: true, limit: 4 }],
  });

  // Function to get translated category name
  const getCategoryName = (category: Category) => {
    const key = `categories.${category.slug}` as keyof typeof t;
    return t(key) || category.name;
  };

  // Function to get translated category description
  const getCategoryDescription = (category: Category) => {
    const key = `categories.${category.slug}.description` as keyof typeof t;
    return t(key) || category.description;
  };

  const trustIndicators = [
    { icon: Truck, text: t('home.features.shipping') },
    { icon: Shield, text: t('home.features.compliant') },
    { icon: Award, text: t('home.features.certified') },
    { icon: MessageSquare, text: t('home.features.support') },
    { icon: Users, text: t('home.features.customers') },
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
              {t('home.hero.title')}
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="kitchen-pro-secondary">
                  {t('home.hero.shopNow')}
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                {t('home.hero.quote')}
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
            <h2 className="text-3xl font-bold text-primary mb-4">{t('home.categories.title')}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {t('home.categories.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.filter(category => category.showOnMainShop).sort((a, b) => a.sortOrder - b.sortOrder).map((category) => (
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
                      <h3 className="text-xl font-semibold text-primary mb-2">{getCategoryName(category)}</h3>
                      <p className="text-slate-600 mb-4">{getCategoryDescription(category)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">50+ {t('home.categories.products')}</span>
                        <Button variant="ghost" className="text-secondary hover:text-blue-600 p-0">
                          {t('home.categories.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
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
            <h2 className="text-3xl font-bold text-primary mb-4">{t('home.products.title')}</h2>
            <p className="text-slate-600">{t('home.products.subtitle')}</p>
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
                <h2 className="text-3xl font-bold text-primary mb-6">{t('home.business.title')}</h2>
                <p className="text-slate-600 mb-8">
                  {t('home.business.description')}
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    t('home.business.wholesale'),
                    t('home.business.accountManager'),
                    t('home.business.priorityShipping'),
                    t('home.business.customLabeling'),
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
                  <ContactModal>
                    <Button className="kitchen-pro-secondary">
                      {t('home.business.getQuote')}
                    </Button>
                  </ContactModal>
                  <Link href="/ai-assistant">
                    <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-white">
                      {t('home.business.contactSales')}
                    </Button>
                  </Link>
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
            <h2 className="text-3xl font-bold text-primary mb-4">{t('home.testimonials.title')}</h2>
            <p className="text-slate-600">{t('home.testimonials.subtitle')}</p>
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
            <h2 className="text-3xl font-bold text-white mb-4">{t('home.newsletter.title')}</h2>
            <p className="text-blue-100 mb-8">
              {t('home.newsletter.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder={t('home.newsletter.placeholder')}
                className="flex-1 bg-white"
              />
              <Button className="bg-white text-secondary hover:bg-slate-100">
                {t('home.newsletter.subscribe')}
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
                {t('footer.company.description')}
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
              <h3 className="text-lg font-semibold text-white mb-4">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-slate-300 hover:text-white transition-colors">{t('footer.aboutUs')}</Link></li>
                <li><a href="#" className="text-slate-300 hover:text-white transition-colors">{t('footer.products')}</a></li>
                <li><Link href="/b2b" className="text-slate-300 hover:text-white transition-colors">{t('footer.b2bSolutions')}</Link></li>
                <li>
                  <ContactModal>
                    <button className="text-slate-300 hover:text-white transition-colors">
                      {t('footer.contact')}
                    </button>
                  </ContactModal>
                </li>
                <li>
                  <Link href="/ai-assistant" className="text-slate-300 hover:text-white transition-colors">
                    {t('footer.support')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">{t('footer.categories')}</h3>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link href={`/products?category=${category.slug}`} className="text-slate-300 hover:text-white transition-colors">
                      {getCategoryName(category)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">{t('footer.support')}</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                  <MessageSquare className="h-5 w-5 text-secondary" />
                  <Link href="/ai-assistant" className="text-white hover:text-secondary transition-colors font-medium">
                    {t('footer.needHelp')} {t('footer.chat')}
                  </Link>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-envelope text-secondary"></i>
                  <span className="text-slate-300">info@kitchen-off.com</span>
                </div>
                <div className="flex items-start space-x-2">
                  <i className="fas fa-map-marker-alt text-secondary mt-1"></i>
                  <div className="text-slate-300">
                    <div>Calea Mosilor 158, Bucharest</div>
                    <div>020883 Romania</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-secondary"></i>
                  <span className="text-slate-300">Mon-Fri: 9AM-5PM EET</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700 mt-8 pt-8 text-center">
            <p className="text-slate-300">
              &copy; 2025 KitchenOff. All rights reserved. | 
              <Link href="/privacy" className="hover:text-white ml-2">Privacy Policy</Link> | 
              <Link href="/terms" className="hover:text-white ml-2">Terms & Conditions</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
