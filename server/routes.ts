import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCategorySchema, insertProductSchema, insertOrderSchema, insertCartItemSchema, insertReviewSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import OpenAI from "openai";

// Ultra-aggressive permanent in-memory cache
const cache = new Map<string, any>();
const CACHE_REFRESH_INTERVAL = 300000; // 5 minutes

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getCachedData(key: string) {
  return cache.get(key) || null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, data);
}

// Permanent data storage - never expires, pre-compiled for ultra-fast access
let categoriesData: any[] = [];
let productsByCategory = new Map<string, any[]>();
let allProductsData: any[] = [];
let productsBySlug = new Map<string, any>();
let stringifiedProductsData: string = '';
let stringifiedCategoriesData: string = '';

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
    
    // Pre-compile data structures for ultra-fast access
    for (const product of allProductsData) {
      productsBySlug.set(product.slug, product);
    }
    
    // Pre-stringify JSON for fastest possible responses
    stringifiedProductsData = JSON.stringify(allProductsData);
    stringifiedCategoriesData = JSON.stringify(categoriesData);
    
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

  app.put("/api/auth/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      
      // Check if email is already taken by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      const updatedUser = await storage.updateUser(req.userId!, {
        firstName,
        lastName,
        email,
      });

      res.json({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        firstName: updatedUser.firstName, 
        lastName: updatedUser.lastName, 
        isAdmin: updatedUser.isAdmin 
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Category routes - instant response from memory
  app.get("/api/categories", (req, res) => {
    // Ultra-fast synchronous response - no JSON.stringify overhead
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'ETag': 'categories-memory',
      'Content-Type': 'application/json'
    });
    res.send(stringifiedCategoriesData);
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

  // Product routes - ultra-fast response from memory
  app.get("/api/products", (req, res) => {
    const { categorySlug, search, limit = "20" } = req.query;
    
    let products: any[] = [];
    
    // Get from memory - no database queries, no async operations
    if (categorySlug) {
      products = productsByCategory.get(categorySlug as string) || [];
    } else {
      products = allProductsData;
    }
    
    // Apply search filter if needed (optimized string operations)
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply limit (optimized slice operation)
    const limitNum = parseInt(limit as string) || 20;
    if (limitNum > 0 && products.length > limitNum) {
      products = products.slice(0, limitNum);
    }
    
    // Set aggressive caching headers for performance
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'ETag': `products-${categorySlug || 'all'}-${limitNum}`,
      'Content-Type': 'application/json'
    });
    
    // For full product list, use pre-stringified data when possible
    if (!categorySlug && !search && limitNum >= allProductsData.length) {
      res.send(stringifiedProductsData);
    } else {
      res.json(products);
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

  // AI Assistant routes
  app.post("/api/ai/connect", async (req, res) => {
    try {
      // Simulate AI connection process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      res.json({ 
        success: true, 
        message: "Connected to AI Assistant",
        sessionId: `ai_session_${Date.now()}`,
        capabilities: [
          "Product recommendations",
          "Kitchen setup advice", 
          "HACCP compliance help",
          "Equipment comparisons",
          "Order status & invoices"
        ]
      });
    } catch (error) {
      console.error("AI connect error:", error);
      res.status(500).json({ message: "Failed to connect to AI Assistant" });
    }
  });

  app.post("/api/ai/chat", async (req: AuthRequest, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get current products for context
      const products = allProductsData.slice(0, 15); // Use first 15 products for context
      const productList = products.map(p => `${p.name} - $${p.price} (ID: ${p.id}, Slug: ${p.slug})`).join(', ');

      // Extract user ID from JWT token if present (optional authentication)
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          userId = decoded.userId;
        } catch (error) {
          // Token is invalid or expired, continue without authentication
          console.log("Invalid or expired token, continuing as guest");
        }
      }

      // Check if user is authenticated for order-related queries
      let userContext = "";
      let userOrders: any[] = [];
      
      if (userId) {
        try {
          userOrders = await storage.getOrders(userId);
          userContext = `\n\nUser is logged in. Available user services:
- Order Status: User has ${userOrders.length} order(s) in their account
- Invoice Information: Can provide invoice details for completed orders
- Order History: Can show past purchases and order tracking

When user asks about orders, invoices, or order status, provide specific information from their order history.`;
        } catch (error) {
          console.error("Error fetching user orders:", error);
        }
      } else {
        userContext = `\n\nUser is not logged in. For order status and invoice information, they need to sign in to their account first.`;
      }

      // Create system prompt with KitchenOff context
      const systemPrompt = `You are an AI assistant for KitchenOff, a professional kitchen equipment and supplies company. You help customers with:

1. Product recommendations from our catalog
2. Kitchen setup advice for commercial and home kitchens
3. HACCP compliance and food safety guidance
4. Equipment comparisons and technical specifications
5. Order status and invoice information (for signed-in users)

Our current featured products include: ${productList}${userContext}

IMPORTANT: When recommending specific products from our catalog, always format them as clickable links using this exact format:
[Product Name](/products/product-slug)

For example: [Digital Food Thermometer](/products/digital-food-thermometer)

Always be helpful, professional, and focus on practical solutions. When recommending products, mention specific items from our catalog when relevant and provide direct links. Keep responses concise but informative.`;

      // Prepare user message with order context if relevant
      let enhancedMessage = message;
      
      // If user is asking about orders and is logged in, add order details
      if (userId && userOrders.length > 0 && (
        message.toLowerCase().includes('order') || 
        message.toLowerCase().includes('invoice') || 
        message.toLowerCase().includes('status') ||
        message.toLowerCase().includes('purchase')
      )) {
        const orderDetails = userOrders.map(order => {
          const orderTotal = order.items.reduce((sum: number, item: any) => sum + (parseFloat(item.product.price) * item.quantity), 0);
          return `Order #${order.id} - Status: ${order.status} - Total: $${orderTotal.toFixed(2)} - Date: ${new Date(order.createdAt).toLocaleDateString()} - Items: ${order.items.length}`;
        }).join('\n');
        
        enhancedMessage = `${message}\n\nUser's Order History:\n${orderDetails}`;
      }

      // Call OpenAI ChatGPT API with timeout and error handling
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedMessage }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
        )
      ]);

      const response = completion.choices[0].message.content || "I'm here to help with your kitchen equipment needs! How can I assist you today?";

      res.json({
        response,
        sessionId,
        timestamp: new Date().toISOString(),
        suggestedActions: [
          "View recommended products",
          "Get compliance checklist",
          "Compare equipment options",
          "Schedule consultation"
        ]
      });
    } catch (error) {
      console.error("AI chat error:", error);
      
      // Provide specific error messages based on error type
      let errorMessage = "I'm temporarily unavailable. Please try again in a moment.";
      
      if (error.message?.includes('timeout')) {
        errorMessage = "The AI service is taking too long to respond. Please try again with a shorter question.";
      } else if (error.message?.includes('rate limit')) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes('API key')) {
        errorMessage = "AI service configuration issue. Please contact support.";
      }
      
      res.status(500).json({ 
        message: errorMessage,
        response: errorMessage
      });
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
