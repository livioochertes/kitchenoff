import { db } from "./db";
import { categories, products, users } from "../shared/schema";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    // Clear existing data
    await db.delete(products);
    await db.delete(categories);
    await db.delete(users);

    // Create categories
    const insertedCategories = await db.insert(categories).values([
      {
        name: "Food Labels",
        slug: "food-labels",
        description: "Professional food labeling solutions for restaurants and food service",
        imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop"
      },
      {
        name: "HACCP Equipment",
        slug: "haccp-equipment",
        description: "Essential equipment for HACCP compliance and food safety",
        imageUrl: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=400&h=300&fit=crop"
      },
      {
        name: "Kitchen Supplies",
        slug: "kitchen-supplies",
        description: "Professional kitchen tools and supplies for commercial use",
        imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
      },
      {
        name: "Cleaning & Sanitizing",
        slug: "cleaning-sanitizing",
        description: "Professional cleaning and sanitizing products for food service",
        imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=300&fit=crop"
      },
      {
        name: "Storage Solutions",
        slug: "storage-solutions",
        description: "Food storage containers and organization systems",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
      }
    ]).returning();

    // Create sample products
    const sampleProducts = [
      // Food Labels
      {
        name: "Expiration Date Labels - 500 pack",
        slug: "expiration-date-labels-500",
        description: "Professional expiration date labels for food safety compliance. Waterproof and freezer-safe.",
        price: "24.99",
        compareAtPrice: "29.99",
        imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[0].id,
        inStock: true,
        stockQuantity: 150,
        featured: true,
        rating: "4.8",
        reviewCount: 24
      },
      {
        name: "Day of the Week Labels - Complete Set",
        slug: "day-of-week-labels-set",
        description: "Color-coded day of the week labels for easy food rotation. Complete 7-day set.",
        price: "19.99",
        compareAtPrice: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[0].id,
        inStock: true,
        stockQuantity: 200,
        featured: true,
        rating: "4.7",
        reviewCount: 18
      },
      {
        name: "Custom Food Labels - 1000 pack",
        slug: "custom-food-labels-1000",
        description: "Customizable food labels with your restaurant name. Professional quality.",
        price: "45.99",
        compareAtPrice: "55.99",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[0].id,
        inStock: true,
        stockQuantity: 75,
        featured: false,
        rating: "4.9",
        reviewCount: 31
      },
      
      // HACCP Equipment
      {
        name: "Digital Food Thermometer",
        slug: "digital-food-thermometer",
        description: "Instant-read digital thermometer for HACCP temperature monitoring. Waterproof design.",
        price: "34.99",
        compareAtPrice: "39.99",
        imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[1].id,
        inStock: true,
        stockQuantity: 120,
        featured: true,
        rating: "4.6",
        reviewCount: 42
      },
      {
        name: "Temperature Log Book",
        slug: "temperature-log-book",
        description: "Professional temperature logging book for HACCP compliance. 100 pages.",
        price: "12.99",
        compareAtPrice: "15.99",
        imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[1].id,
        inStock: true,
        stockQuantity: 300,
        featured: false,
        rating: "4.5",
        reviewCount: 15
      },
      {
        name: "Infrared Thermometer Gun",
        slug: "infrared-thermometer-gun",
        description: "Non-contact infrared thermometer for quick temperature checks. Professional grade.",
        price: "89.99",
        compareAtPrice: "109.99",
        imageUrl: "https://images.unsplash.com/photo-1585435557343-3b092031d4c1?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[1].id,
        inStock: true,
        stockQuantity: 45,
        featured: true,
        rating: "4.8",
        reviewCount: 38
      },
      
      // Kitchen Supplies
      {
        name: "Commercial Cutting Board Set",
        slug: "commercial-cutting-board-set",
        description: "Color-coded cutting boards for preventing cross-contamination. NSF certified.",
        price: "67.99",
        compareAtPrice: "79.99",
        imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
        categoryId: insertedCategories[2].id,
        inStock: true,
        stockQuantity: 85,
        featured: true,
        rating: "4.7",
        reviewCount: 29
      },
      {
        name: "Professional Chef Knife Set",
        slug: "professional-chef-knife-set",
        description: "High-quality stainless steel knife set for professional kitchens. Includes sharpener.",
        price: "124.99",
        compareAtPrice: "149.99",
        imageUrl: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[2].id,
        inStock: true,
        stockQuantity: 35,
        featured: false,
        rating: "4.9",
        reviewCount: 56
      },
      {
        name: "Stainless Steel Mixing Bowls",
        slug: "stainless-steel-mixing-bowls",
        description: "Professional grade mixing bowls. Set of 6 different sizes. Dishwasher safe.",
        price: "39.99",
        compareAtPrice: "49.99",
        imageUrl: "https://images.unsplash.com/photo-1556909114-be3ab0b3a5e2?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[2].id,
        inStock: true,
        stockQuantity: 95,
        featured: false,
        rating: "4.6",
        reviewCount: 22
      },
      
      // Cleaning & Sanitizing
      {
        name: "Food-Safe Sanitizer Spray",
        slug: "food-safe-sanitizer-spray",
        description: "EPA-approved sanitizer spray for food contact surfaces. 32 oz bottle.",
        price: "16.99",
        compareAtPrice: "19.99",
        imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop",
        categoryId: insertedCategories[3].id,
        inStock: true,
        stockQuantity: 180,
        featured: true,
        rating: "4.5",
        reviewCount: 35
      },
      {
        name: "Degreaser Concentrate",
        slug: "degreaser-concentrate",
        description: "Heavy-duty degreaser concentrate. Makes 10 gallons. Commercial grade.",
        price: "28.99",
        compareAtPrice: "34.99",
        imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
        categoryId: insertedCategories[3].id,
        inStock: true,
        stockQuantity: 120,
        featured: false,
        rating: "4.7",
        reviewCount: 18
      },
      
      // Storage Solutions
      {
        name: "Food Storage Container Set",
        slug: "food-storage-container-set",
        description: "Airtight food storage containers. Set of 12 with labels. BPA-free.",
        price: "54.99",
        compareAtPrice: "64.99",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80",
        categoryId: insertedCategories[4].id,
        inStock: true,
        stockQuantity: 75,
        featured: true,
        rating: "4.8",
        reviewCount: 41
      },
      {
        name: "Commercial Food Storage Bins",
        slug: "commercial-food-storage-bins",
        description: "Large capacity food storage bins with wheels. NSF certified. Set of 3.",
        price: "189.99",
        compareAtPrice: "229.99",
        imageUrl: "https://images.unsplash.com/photo-1563220552-5a5b5f3d7b5b?w=400&h=400&fit=crop",
        categoryId: insertedCategories[4].id,
        inStock: true,
        stockQuantity: 25,
        featured: false,
        rating: "4.6",
        reviewCount: 12
      }
    ];

    await db.insert(products).values(sampleProducts);

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values([
      {
        email: "admin@kitchenpro.com",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        firstName: "Admin",
        lastName: "User"
      }
    ]);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}