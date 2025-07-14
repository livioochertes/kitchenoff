import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCategorySchema, insertProductSchema, insertOrderSchema, insertCartItemSchema, insertReviewSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";

// Ultra-aggressive permanent in-memory cache
const cache = new Map<string, any>();
const CACHE_REFRESH_INTERVAL = 300000; // 5 minutes

function getCachedData(key: string) {
  return cache.get(key) || null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, data);
}

// Permanent data storage - never expires
let categoriesData: any[] = [];
let productsByCategory = new Map<string, any[]>();
let allProductsData: any[] = [];

// Load ALL data into memory at startup - never hit database again
async function loadAllDataIntoMemory() {
  try {
    console.log('Loading all data into permanent memory...');
    
    // Load categories
    categoriesData = await storage.getCategories();
    setCachedData('categories-all', categoriesData);
    
    // Load products for each category (all products, no limit)
    for (const category of categoriesData) {
      const products = await storage.getProducts({
        categoryId: category.id
      });
      productsByCategory.set(category.slug, products);
    }
    
    // Load all products (no filter, no limit)
    allProductsData = await storage.getProducts({});
    
    console.log('✅ All data loaded into permanent memory - database queries eliminated');
    console.log(`📊 Memory data loaded: ${allProductsData.length} total products`);
    console.log(`📊 First 5 products in memory:`, allProductsData.slice(0, 5).map(p => ({ id: p.id, name: p.name })));
    console.log(`📊 All products data variable type:`, typeof allProductsData);
    console.log(`📊 All products data is array:`, Array.isArray(allProductsData));
  } catch (error) {
    console.error('Failed to load data into memory:', error);
  }
}

// Refresh data periodically
setInterval(loadAllDataIntoMemory, CACHE_REFRESH_INTERVAL);

// JWT middleware
interface AuthRequest extends Request {
  userId?: number;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.userId = user.id;
    next();
  });
};

const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ message: "Access token required" });
  }

  const user = await storage.getUser(req.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Category routes - instant response from memory
  app.get("/api/categories", async (req, res) => {
    try {
      res.set({
        'Cache-Control': 'public, max-age=3600', // 1 hour
        'ETag': 'categories-memory'
      });
      res.json(categoriesData);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/categories", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.put("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const categoryData = req.body;
      const category = await storage.updateCategory(categoryId, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      await storage.deleteCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes - instant response from memory
  app.get("/api/products", async (req, res) => {
    try {
      const { categorySlug, search, limit = "20" } = req.query;
      
      console.log("📊 API Request:", {
        categorySlug,
        search,
        limit,
        allParams: req.query
      });
      
      let products: any[] = [];
      
      // Get from memory - no database queries
      if (categorySlug) {
        products = productsByCategory.get(categorySlug as string) || [];
        console.log(`📊 Category lookup: ${products.length} products found for category: ${categorySlug}`);
      } else {
        products = allProductsData;
        console.log(`📊 All products lookup: ${products.length} products found from allProductsData`);
        console.log(`📊 allProductsData type: ${typeof allProductsData}, isArray: ${Array.isArray(allProductsData)}`);
        if (products.length > 0) {
          console.log(`📊 First 3 products IDs: ${products.slice(0, 3).map(p => p.id).join(', ')}`);
        }
      }
      
      // Apply search filter if needed
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        products = products.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply limit
      const limitNum = parseInt(limit as string) || 20;
      console.log(`📊 Before limit: ${products.length} products, applying limit: ${limitNum}`);
      if (limitNum > 0) {
        products = products.slice(0, limitNum);
      }
      console.log(`📊 After limit: ${products.length} products being returned`);
      
      // Remove caching headers to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Failed to get product" });
    }
  });

  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Get product by slug error:", error);
      res.status(500).json({ message: "Failed to get product" });
    }
  });

  app.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = req.body;
      const product = await storage.updateProduct(productId, productData);
      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(400).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      await storage.deleteProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Cart routes
  app.get("/api/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cartItems = await storage.getCartItems(req.userId!);
      res.json(cartItems);
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ message: "Failed to get cart" });
    }
  });

  app.post("/api/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(400).json({ message: "Failed to add to cart" });
    }
  });

  app.put("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(cartItemId, quantity);
      res.json(cartItem);
    } catch (error) {
      console.error("Update cart item error:", error);
      res.status(400).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      await storage.removeFromCart(cartItemId);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.delete("/api/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.clearCart(req.userId!);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Order routes
  app.get("/api/orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orders = await storage.getOrders(req.userId);
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  app.get("/api/orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Failed to get order" });
    }
  });

  app.post("/api/orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { shippingAddress, billingAddress, paymentMethod, items } = req.body;
      
      // Calculate total amount
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      const orderData = {
        userId: req.userId!,
        status: "pending",
        totalAmount: totalAmount.toString(),
        shippingAddress,
        billingAddress,
        paymentMethod,
        paymentStatus: "pending",
      };

      const order = await storage.createOrder(orderData, items);
      
      // Clear cart after successful order
      await storage.clearCart(req.userId!);
      
      res.json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(400).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id/status", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      const order = await storage.updateOrderStatus(orderId, status);
      res.json(order);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(400).json({ message: "Failed to update order status" });
    }
  });

  // Review routes
  app.get("/api/products/:id/reviews", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getProductReviews(productId);
      res.json(reviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ message: "Failed to get reviews" });
    }
  });

  app.post("/api/products/:id/reviews", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        productId,
        userId: req.userId,
      });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(400).json({ message: "Failed to create review" });
    }
  });

  // Admin routes
  app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Get admin orders error:", error);
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // Stripe Payment Routes
  app.post("/api/payments/stripe/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency } = req.body;

      if (!amount || !currency) {
        return res.status(400).json({ message: "Amount and currency are required" });
      }

      // Create payment intent with Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      });
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        metadata: {
          source: 'kitchenpro-supply'
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating Stripe payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Revolut Payment Routes
  app.post("/api/payments/revolut/create-order", async (req, res) => {
    try {
      const { amount, currency } = req.body;

      if (!amount || !currency) {
        return res.status(400).json({ message: "Amount and currency are required" });
      }

      // Create order with Revolut
      const orderData = {
        amount: Math.round(amount), // Amount in cents
        currency: currency.toUpperCase(),
        description: "KitchenPro Supply Order",
        capture_mode: "automatic",
        merchant_order_ext_ref: `order_${Date.now()}`,
        settlement_currency: "USD",
      };

      // Create real Revolut order using the API
      const revolutApiUrl = "https://merchant.revolut.com/api/1.0/orders";
      
      const revolutResponse = await fetch(revolutApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REVOLUT_API_KEY}`,
          "Revolut-Api-Version": "2024-12-01",
        },
        body: JSON.stringify(orderData),
      });

      if (!revolutResponse.ok) {
        const errorText = await revolutResponse.text();
        console.error("Revolut API Error:", revolutResponse.status, errorText);
        throw new Error(`Revolut API error: ${revolutResponse.status}`);
      }

      const revolutOrder = await revolutResponse.json();
      console.log("Revolut order created:", revolutOrder);
      
      res.json(revolutOrder);
    } catch (error) {
      console.error("Error creating Revolut order:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/payments/revolut/webhook", async (req, res) => {
    try {
      const { event, data } = req.body;

      console.log("Revolut webhook received:", event, data);

      // Handle different webhook events
      switch (event) {
        case "ORDER_PAYMENT_COMPLETED":
          // Update order status in database
          console.log("Payment completed for order:", data.merchant_order_ext_ref);
          break;
        case "ORDER_PAYMENT_FAILED":
          // Handle payment failure
          console.log("Payment failed for order:", data.merchant_order_ext_ref);
          break;
        case "ORDER_PAYMENT_CANCELLED":
          // Handle payment cancellation
          console.log("Payment cancelled for order:", data.merchant_order_ext_ref);
          break;
        default:
          console.log("Unknown webhook event:", event);
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  const httpServer = createServer(app);
  
  // Load all data into memory after server setup
  setTimeout(loadAllDataIntoMemory, 2000); // Wait 2 seconds for database to be ready
  
  return httpServer;
}
