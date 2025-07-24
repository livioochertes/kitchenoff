import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCategorySchema, insertProductSchema, insertOrderSchema, insertCartItemSchema, insertReviewSchema, insertInvoiceSchema, insertInvoiceItemSchema, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import OpenAI from "openai";
import QRCode from "qrcode";
import path from "path";
import { createInvoiceService } from './invoice-service.js';
import { sendNotificationPreferencesEmail } from './email-service.js';

// Authentication interfaces
interface AuthRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
  user?: {
    id: number;
    email: string;
    isAdmin?: boolean;
  };
}

// JWT authentication middleware
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided in Authorization header');
      return res.status(401).json({ message: "Access token required" });
    }

    console.log('🔍 Attempting to verify token:', token?.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
    console.log('✅ Token decoded successfully:', { id: decoded.id, email: decoded.email });
    
    // Get user to check admin status
    const user = await storage.getUser(decoded.id);
    if (!user) {
      console.log('❌ User not found for id:', decoded.id);
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log('✅ User found:', { id: user.id, email: user.email, isAdmin: user.isAdmin });
    req.userId = decoded.id;
    req.isAdmin = user.isAdmin || false;
    req.user = { id: user.id, email: user.email, isAdmin: user.isAdmin || false };
    next();
  } catch (error: any) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Ultra-aggressive permanent in-memory cache
const cache = new Map<string, any>();
const CACHE_REFRESH_INTERVAL = 300000; // 5 minutes

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Invoice Service with Smartbill enabled
process.env.ENABLE_SMARTBILL = 'true';
let invoiceService: any;

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
export async function loadAllDataIntoMemory() {
  try {
    console.log('Loading all data into permanent memory...');
    
    // Load categories
    categoriesData = await storage.getCategories();
    setCachedData('categories-all', categoriesData);
    
    // Refresh stringified categories data
    stringifiedCategoriesData = JSON.stringify(categoriesData);
    
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
    
    console.log('✅ All data loaded into permanent memory - database queries eliminated');
    console.log(`📊 Memory data loaded: ${allProductsData.length} total products`);
    console.log(`📊 First 5 products in memory:`, allProductsData.slice(0, 5).map(p => ({ id: p.id, name: p.name })));
    console.log(`📊 All products data variable type:`, typeof allProductsData);
    console.log(`📊 All products data is array:`, Array.isArray(allProductsData));
  } catch (error) {
    console.error('Failed to load data into memory:', error);
  }
}

// Refresh data periodically (but not too frequently to avoid product disappearing)
let isRefreshing = false;
setInterval(async () => {
  if (!isRefreshing) {
    isRefreshing = true;
    await loadAllDataIntoMemory();
    isRefreshing = false;
  }
}, CACHE_REFRESH_INTERVAL);

// Remove duplicate - using the one defined above

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
  // Admin interface route (original flow preserved)
  app.get("/admin", (req, res) => {
    try {
      const adminPath = path.resolve('./admin/index.html');
      console.log('Serving admin interface from:', adminPath);
      
      // Set cache headers for better performance
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      });
      
      res.sendFile(adminPath);
    } catch (error) {
      console.error('Error serving admin interface:', error);
      res.status(500).send('Admin interface not available');
    }
  });

  // Fast admin interface route (instant loading - no Babel)
  app.get("/admin-fast", (req, res) => {
    try {
      const adminPath = path.resolve('./admin/admin-production.html');
      console.log('Serving fast admin interface from:', adminPath);
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      });
      
      res.sendFile(adminPath);
    } catch (error) {
      console.error('Error serving fast admin interface:', error);
      res.status(500).send('Fast admin interface not available');
    }
  });

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
        // Invoice details fields
        companyName: user.companyName,
        vatNumber: user.vatNumber,
        registrationNumber: user.registrationNumber,
        taxId: user.taxId,
        companyAddress: user.companyAddress,
        companyCity: user.companyCity,
        companyState: user.companyState,
        companyCounty: user.companyCounty, // Add missing county field
        companyZip: user.companyZip,
        companyCountry: user.companyCountry,
        billingEmail: user.billingEmail,
        billingPhone: user.billingPhone,
        // Delivery address
        deliveryAddress: user.deliveryAddress,
        deliveryCity: user.deliveryCity,
        deliveryState: user.deliveryState,
        deliveryCounty: user.deliveryCounty, // Add missing delivery county field
        deliveryZip: user.deliveryZip,
        deliveryCountry: user.deliveryCountry,
        deliveryInstructions: user.deliveryInstructions,
        // Notification preferences
        emailNotifications: user.emailNotifications,
        orderUpdates: user.orderUpdates,
        productRestocks: user.productRestocks,
        priceDrops: user.priceDrops,
        promotions: user.promotions,
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
        isAdmin: updatedUser.isAdmin,
        // Include invoice fields in profile response too
        companyName: updatedUser.companyName,
        vatNumber: updatedUser.vatNumber,
        registrationNumber: updatedUser.registrationNumber,
        taxId: updatedUser.taxId,
        companyAddress: updatedUser.companyAddress,
        companyCity: updatedUser.companyCity,
        companyState: updatedUser.companyState,
        companyCounty: updatedUser.companyCounty,
        companyZip: updatedUser.companyZip,
        companyCountry: updatedUser.companyCountry,
        billingEmail: updatedUser.billingEmail,
        billingPhone: updatedUser.billingPhone,
        deliveryAddress: updatedUser.deliveryAddress,
        deliveryCity: updatedUser.deliveryCity,
        deliveryState: updatedUser.deliveryState,
        deliveryCounty: updatedUser.deliveryCounty,
        deliveryZip: updatedUser.deliveryZip,
        deliveryCountry: updatedUser.deliveryCountry,
        deliveryInstructions: updatedUser.deliveryInstructions,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });



  // Update invoice details endpoint
  app.put("/api/auth/invoice", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const {
        companyName,
        vatNumber,
        registrationNumber,
        taxId,
        companyAddress,
        companyCity,
        companyState,
        companyCounty,
        companyZip,
        companyCountry,
        billingEmail,
        billingPhone,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryCounty,
        deliveryZip,
        deliveryCountry,
        deliveryInstructions,
      } = req.body;

      console.log('🔄 Updating user profile data for user:', req.userId);
      console.log('📊 Profile data received:', {
        companyName, companyAddress, companyCity, companyCounty, 
        billingEmail, billingPhone
      });

      const updatedUser = await storage.updateUser(req.userId!, {
        companyName,
        vatNumber,
        registrationNumber,
        taxId,
        companyAddress,
        companyCity,
        companyState,
        companyCounty,
        companyZip,
        companyCountry,
        billingEmail,
        billingPhone,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryCounty,
        deliveryZip,
        deliveryCountry,
        deliveryInstructions,
      });

      console.log('✅ User profile updated successfully:', {
        id: updatedUser.id,
        companyName: updatedUser.companyName,
        companyAddress: updatedUser.companyAddress,
        companyCity: updatedUser.companyCity
      });

      res.json({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        firstName: updatedUser.firstName, 
        lastName: updatedUser.lastName, 
        isAdmin: updatedUser.isAdmin,
        // Include all invoice/company fields
        companyName: updatedUser.companyName,
        vatNumber: updatedUser.vatNumber,
        registrationNumber: updatedUser.registrationNumber,
        taxId: updatedUser.taxId,
        companyAddress: updatedUser.companyAddress,
        companyCity: updatedUser.companyCity,
        companyState: updatedUser.companyState,
        companyCounty: updatedUser.companyCounty,
        companyZip: updatedUser.companyZip,
        companyCountry: updatedUser.companyCountry,
        billingEmail: updatedUser.billingEmail,
        billingPhone: updatedUser.billingPhone,
        deliveryAddress: updatedUser.deliveryAddress,
        deliveryCity: updatedUser.deliveryCity,
        deliveryState: updatedUser.deliveryState,
        deliveryCounty: updatedUser.deliveryCounty,
        deliveryZip: updatedUser.deliveryZip,
        deliveryCountry: updatedUser.deliveryCountry,
        deliveryInstructions: updatedUser.deliveryInstructions,
        // Include notification preferences too
        emailNotifications: updatedUser.emailNotifications,
        orderUpdates: updatedUser.orderUpdates,
        productRestocks: updatedUser.productRestocks,
        priceDrops: updatedUser.priceDrops,
        promotions: updatedUser.promotions,
      });
    } catch (error) {
      console.error("❌ Error updating invoice details:", error);
      console.error("❌ Error stack:", (error as Error).stack);
      res.status(500).json({ message: "Failed to update invoice details" });
    }
  });

  // Change password endpoint
  app.put("/api/auth/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Get current user
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updatedUser = await storage.updateUser(req.userId!, {
        password: hashedNewPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Update notification preferences endpoint
  app.put("/api/auth/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const {
        emailNotifications,
        orderUpdates,
        productRestocks,
        priceDrops,
        promotions,
      } = req.body;

      // Update user notification preferences in the database
      const [updatedUser] = await db
        .update(users)
        .set({
          emailNotifications,
          orderUpdates,
          productRestocks,
          priceDrops,
          promotions,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send confirmation email to test user (liviu.chertes@gmail.com)
      const preferences = {
        emailNotifications: updatedUser.emailNotifications,
        orderUpdates: updatedUser.orderUpdates,
        productRestocks: updatedUser.productRestocks,
        priceDrops: updatedUser.priceDrops,
        promotions: updatedUser.promotions,
      };

      try {
        await sendNotificationPreferencesEmail(updatedUser, {
          emailNotifications: updatedUser.emailNotifications || false,
          orderUpdates: updatedUser.orderUpdates || false,
          productRestocks: updatedUser.productRestocks || false,
          priceDrops: updatedUser.priceDrops || false,
          promotions: updatedUser.promotions || false
        });
        console.log('✅ Notification preferences email sent successfully to:', updatedUser.email);
      } catch (emailError) {
        console.error('❌ Failed to send notification preferences email:', emailError);
        // Continue with success response even if email fails
      }
      
      res.json({ 
        message: "Notification preferences updated successfully",
        preferences
      });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check if user owns this invoice or is admin
      if (invoice.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.get("/api/invoices/number/:invoiceNumber", async (req, res) => {
    try {
      const invoiceNumber = req.params.invoiceNumber;
      const invoice = await storage.getInvoiceByNumber(invoiceNumber);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice by number:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Create invoice from order
  // Create invoice from order - both endpoints for compatibility
  app.post("/api/orders/:orderId/create-invoice", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { paymentMethod = 'wire_transfer' } = req.body;
      
      // Get the order with items
      const order = await storage.getOrder(orderId);
      console.log(`Fetched order ${orderId}:`, JSON.stringify(order, null, 2));
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user owns this order or is admin
      if (order.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if order has items
      if (!order.items || order.items.length === 0) {
        console.error(`Order ${orderId} has no items:`, order.items);
        return res.status(400).json({ message: "Order has no items to create invoice" });
      }

      // Generate unique invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Create payment link for wire transfer
      let paymentLink = '';
      if (paymentMethod === 'wire_transfer') {
        paymentLink = `https://www.kitchenoff.app/pay/invoice/${invoiceNumber}`;
      }

      // Calculate totals with 19% VAT for RON
      const subtotal = parseFloat(order.totalAmount);
      const vatRate = 19; // 19% VAT for Romanian invoices
      const vatAmount = (subtotal * vatRate) / (100 + vatRate); // Extract VAT from total
      const subtotalWithoutVat = subtotal - vatAmount;
      const totalAmount = subtotal; // Total already includes VAT

      // Create invoice
      const invoiceData = {
        invoiceNumber,
        orderId,
        userId: order.userId!,
        issueDate: new Date(),
        supplyDate: new Date(),
        subtotal: subtotalWithoutVat.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        currency: 'RON',
        paymentMethod,
        paymentLink: paymentLink || null,
        notes: 'Factura cu TVA 19% conform legislației române',
      };

      // Create invoice items
      const invoiceItems = order.items.map(item => ({
        invoiceId: 0, // Will be set after invoice creation
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.productCode || null,
        quantity: item.quantity,
        unitPrice: item.price,
        vatRate: '19.00',
        lineTotal: item.totalPrice,
      }));

      const invoice = await storage.createInvoice(invoiceData as any, invoiceItems);
      
      // Get the full invoice with items for response
      const fullInvoice = await storage.getInvoice(invoice.id);
      
      res.json(fullInvoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.post("/api/orders/:orderId/invoice", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { paymentMethod = 'wire_transfer' } = req.body;
      
      console.log(`🧾 CREATING INVOICE for order ${orderId} using Smartbill integration`);
      console.log(`📋 Smartbill Configuration: enabled=${process.env.ENABLE_SMARTBILL === 'true'}, series=${process.env.SMARTBILL_SERIES}`);
      
      // Get the order with items
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user owns this order or is admin
      if (order.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get user details for Smartbill invoice
      const user = await storage.getUser(order.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Initialize InvoiceService with corrected Smartbill configuration
      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();

      console.log(`📋 Smartbill enabled: ${process.env.ENABLE_SMARTBILL === 'true'}, Series: ${process.env.SMARTBILL_SERIES}`);

      // Create invoice using InvoiceService (will use Smartbill if enabled)
      const invoice = await invoiceService.createInvoiceForOrder(order, user, { paymentMethod });
      
      console.log(`✅ Invoice created successfully:`, {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        smartbillId: invoice.smartbillId,
        source: invoice.smartbillId ? 'Smartbill' : 'Local'
      });
      
      res.json(invoice);
    } catch (error) {
      console.error(`❌ Error creating invoice for order ${req.params.orderId}:`, error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Download invoice as PDF (placeholder for now)
  app.get("/api/invoices/:id/download", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check if user owns this invoice or is admin
      if (invoice.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      // For now, return a message that PDF generation is not implemented
      // In a real application, you would generate a PDF here using a library like puppeteer
      res.status(501).json({ message: "PDF generation not yet implemented" });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Failed to download invoice" });
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

  // AWB Generation routes
  app.post("/api/orders/:id/generate-awb", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { createSamedayAPI } = await import('./sameday-api');
      const samedayAPI = createSamedayAPI();
      
      if (!samedayAPI) {
        return res.status(500).json({ message: "Sameday API not configured. Please add SAMEDAY_USERNAME and SAMEDAY_PASSWORD environment variables." });
      }

      // Get pickup points and services
      const [pickupPoints, services] = await Promise.all([
        samedayAPI.getPickupPoints(),
        samedayAPI.getServices()
      ]);

      if (pickupPoints.length === 0) {
        return res.status(500).json({ message: "No pickup points configured for Sameday" });
      }

      if (services.length === 0) {
        return res.status(500).json({ message: "No services configured for Sameday" });
      }

      const shippingAddr = order.shippingAddress as any;
      const defaultPickupPoint = pickupPoints[0];
      const defaultService = services[0];

      // Calculate total parcel weight (estimate 1kg per item if not specified)
      const totalWeight = (order.items?.length || 1) * 1; // 1kg per item estimate

      const awbData = {
        pickupPoint: defaultPickupPoint.id,
        contactPerson: defaultPickupPoint.contactPersons?.[0]?.id,
        service: defaultService.id,
        packageType: 1, // Parcel type
        awbPayment: 1, // Sender pays
        thirdPartyPickup: 0, // No third party pickup
        awbRecipient: {
          name: `${shippingAddr.firstName} ${shippingAddr.lastName}`,
          phoneNumber: shippingAddr.phone || '0700000000',
          personType: 1, // Natural person
          email: shippingAddr.email,
          companyName: shippingAddr.companyName || `${shippingAddr.firstName} ${shippingAddr.lastName}`,
          address: shippingAddr.address,
          countyString: shippingAddr.county || shippingAddr.state,
          cityString: shippingAddr.city,
          postalCode: shippingAddr.postalCode,
        },
        parcels: [{
          weight: totalWeight,
          awbParcelNumber: `KTO${order.id.toString().padStart(5, '0')}`,
        }],
        cashOnDelivery: 0, // No COD for now
        insuredValue: parseFloat(order.totalAmount.toString()),
        observation: `Order #${order.id} - KitchenOff E-commerce`,
        clientInternalReference: `ORDER_${order.id}`,
      };

      // Create AWB with Sameday
      const awbResponse = await samedayAPI.createAWB(awbData);

      // Update order with AWB information
      const updatedOrder = await storage.updateOrder(orderId, {
        status: 'shipped',
        awbNumber: awbResponse.awbNumber,
        awbCourier: 'sameday',
        awbCost: awbResponse.cost.toString(),
        awbCurrency: awbResponse.currency,
        awbCreatedAt: new Date(),
      });

      console.log('✅ AWB generated successfully:', awbResponse.awbNumber);

      res.json({
        success: true,
        awbNumber: awbResponse.awbNumber,
        awbCost: awbResponse.cost,
        currency: awbResponse.currency,
        order: updatedOrder,
        trackingUrl: `https://sameday.ro/track/${awbResponse.awbNumber}`,
      });

    } catch (error) {
      console.error("Generate AWB error:", error);
      res.status(500).json({ 
        message: "Failed to generate AWB", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get AWB PDF
  app.get("/api/orders/:id/awb-pdf", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order || !order.awbNumber) {
        return res.status(404).json({ message: "Order or AWB not found" });
      }

      const { createSamedayAPI } = await import('./sameday-api');
      const samedayAPI = createSamedayAPI();
      
      if (!samedayAPI) {
        return res.status(500).json({ message: "Sameday API not configured" });
      }

      const pdfBuffer = await samedayAPI.getAWBPDF(order.awbNumber);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="AWB_${order.awbNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Get AWB PDF error:", error);
      res.status(500).json({ message: "Failed to get AWB PDF" });
    }
  });

  // Track AWB
  app.get("/api/orders/:id/track-awb", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user owns this order or is admin
      if (order.userId !== req.userId && !req.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!order.awbNumber) {
        return res.status(404).json({ message: "AWB not found for this order" });
      }

      const { createSamedayAPI } = await import('./sameday-api');
      const samedayAPI = createSamedayAPI();
      
      if (!samedayAPI) {
        return res.status(500).json({ message: "Sameday API not configured" });
      }

      const trackingInfo = await samedayAPI.trackAWB(order.awbNumber);

      res.json({
        awbNumber: order.awbNumber,
        trackingUrl: `https://sameday.ro/track/${order.awbNumber}`,
        trackingInfo,
      });

    } catch (error) {
      console.error("Track AWB error:", error);
      res.status(500).json({ message: "Failed to track AWB" });
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

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, subject, category, message, orderNumber } = req.body;
      
      // Validate required fields
      if (!name || !email || !subject || !message || !category) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: name, email, subject, message, and category are required" 
        });
      }

      // Log the contact form submission (in a real application, you'd save this to database)
      console.log("Contact form submission:", {
        name,
        email,
        phone: phone || 'Not provided',
        subject,
        category,
        message,
        orderNumber: orderNumber || 'Not provided',
        timestamp: new Date().toISOString(),
        ip: req.ip || 'unknown'
      });

      // In a real application, you would:
      // 1. Save the contact form data to database
      // 2. Send email notifications to the support team
      // 3. Possibly send an auto-reply to the customer
      // 4. Create a ticket in your support system

      // For now, simulate successful submission
      res.json({
        success: true,
        message: "Thank you for contacting us! We've received your message and will respond within 24 hours.",
        ticketId: `TICKET_${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to submit contact form. Please try again." 
      });
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
      const { message, sessionId, language } = req.body;
      
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

      // Language context for multilingual support
      const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French', 
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic'
      };
      
      const userLanguage = (languageMap as any)[language] || 'English';
      const languageInstruction = language && language !== 'en' 
        ? `\n\nIMPORTANT: Respond in ${userLanguage} language. The user interface is in ${userLanguage}, so provide your response in the same language to ensure consistency.`
        : '';

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

Always be helpful, professional, and focus on practical solutions. When recommending products, mention specific items from our catalog when relevant and provide direct links. Keep responses concise but informative.${languageInstruction}`;

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

      const response = (completion as any).choices[0].message.content || "I'm here to help with your kitchen equipment needs! How can I assist you today?";

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
    } catch (error: any) {
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
      const { amount, currency, orderId } = req.body;

      if (!amount || !currency) {
        return res.status(400).json({ message: "Amount and currency are required" });
      }

      // Create payment intent with Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2020-08-27' as any,
      });
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        metadata: {
          source: 'kitchenoff',
          orderId: orderId?.toString() || ''
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating Stripe payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Stripe webhook for payment completion
  app.post("/api/payments/stripe/webhook", async (req, res) => {
    try {
      const event = req.body;

      console.log("Stripe webhook received:", event.type);

      // Handle different webhook events
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          console.log(`Payment succeeded for order ${orderId}`);
          
          // Update order status
          await storage.updateOrder(parseInt(orderId), {
            paymentStatus: 'paid',
            status: 'processing'
          });

          // Generate invoice automatically via Smartbill API
          try {
            // Initialize invoice service if needed
            if (!invoiceService) {
              invoiceService = await createInvoiceService();
            }
            
            const invoice = await invoiceService.generateInvoiceAfterPayment(
              parseInt(orderId),
              {
                status: 'succeeded',
                paymentMethod: 'card',
                paymentId: paymentIntent.id,
                amount: paymentIntent.amount / 100 // Convert from cents
              }
            );

            console.log(`Invoice generated automatically for order ${orderId}:`, invoice.invoiceNumber);
          } catch (invoiceError) {
            console.error(`Failed to generate invoice for order ${orderId}:`, invoiceError);
            // Don't fail the webhook - invoice can be generated manually later
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        if (orderId) {
          console.log(`Payment failed for order ${orderId}`);
          
          await storage.updateOrder(parseInt(orderId), {
            paymentStatus: 'failed',
            status: 'cancelled'
          });
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error processing Stripe webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
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
          console.log("Payment completed for order:", data.merchant_order_ext_ref);
          
          // Extract order ID from merchant reference
          const orderIdMatch = data.merchant_order_ext_ref?.match(/order_(\d+)/);
          if (orderIdMatch) {
            const orderId = parseInt(orderIdMatch[1]);
            
            // Update order status
            await storage.updateOrder(orderId, {
              paymentStatus: 'paid',
              status: 'processing'
            });

            // Generate invoice automatically via Smartbill API
            try {
              // Initialize invoice service if needed
              if (!invoiceService) {
                invoiceService = await createInvoiceService();
              }
              
              const invoice = await invoiceService.generateInvoiceAfterPayment(
                orderId,
                {
                  status: 'completed',
                  paymentMethod: 'revolut_pay',
                  paymentId: data.id,
                  amount: data.order_amount?.value / 100 || 0
                }
              );

              console.log(`Invoice generated automatically for order ${orderId}:`, invoice.invoiceNumber);
            } catch (invoiceError) {
              console.error(`Failed to generate invoice for order ${orderId}:`, invoiceError);
            }
          }
          break;
          
        case "ORDER_PAYMENT_FAILED":
          console.log("Payment failed for order:", data.merchant_order_ext_ref);
          
          const failedOrderIdMatch = data.merchant_order_ext_ref?.match(/order_(\d+)/);
          if (failedOrderIdMatch) {
            await storage.updateOrder(parseInt(failedOrderIdMatch[1]), {
              paymentStatus: 'failed',
              status: 'cancelled'
            });
          }
          break;
          
        case "ORDER_PAYMENT_CANCELLED":
          console.log("Payment cancelled for order:", data.merchant_order_ext_ref);
          
          const cancelledOrderIdMatch = data.merchant_order_ext_ref?.match(/order_(\d+)/);
          if (cancelledOrderIdMatch) {
            await storage.updateOrder(parseInt(cancelledOrderIdMatch[1]), {
              paymentStatus: 'cancelled',
              status: 'cancelled'
            });
          }
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

  // Public shipping settings endpoint (no auth required)
  app.get("/api/shipping-settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json({
        freeShippingThreshold: settings?.freeShippingThreshold || "500.00",
        standardShippingCost: settings?.standardShippingCost || "25.00",
        currency: settings?.defaultCurrency || "EUR",
      });
    } catch (error) {
      console.error("Error fetching shipping settings:", error);
      res.status(500).json({ message: "Failed to fetch shipping settings" });
    }
  });

  // Smartbill API Test endpoints
  app.get("/api/smartbill/test", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Initialize invoice service if needed
      if (!invoiceService) {
        invoiceService = await createInvoiceService();
      }
      
      const connected = await invoiceService.testConnection();
      res.json({ 
        connected,
        smartbillEnabled: process.env.ENABLE_SMARTBILL === 'true',
        hasCredentials: !!(process.env.SMARTBILL_USERNAME && process.env.SMARTBILL_TOKEN && process.env.SMARTBILL_COMPANY_VAT)
      });
    } catch (error) {
      console.error("Error testing Smartbill connection:", error);
      res.status(500).json({ message: "Failed to test connection", error: error.message });
    }
  });

  app.post("/api/orders/:orderId/generate-invoice-smartbill", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const orderId = parseInt(req.params.orderId);
      const { paymentMethod = 'card' } = req.body;

      // Initialize invoice service if needed
      if (!invoiceService) {
        invoiceService = await createInvoiceService();
      }
      
      const invoice = await invoiceService.generateInvoiceAfterPayment(orderId, {
        status: 'succeeded',
        paymentMethod,
        paymentId: `manual_${Date.now()}`,
        amount: 0 // Will be calculated from order
      });

      res.json(invoice);
    } catch (error) {
      console.error("Error generating test invoice:", error);
      res.status(500).json({ message: "Failed to generate invoice", error: error.message });
    }
  });

  // Admin access routes for testing and fallback
  app.get('/admin', (req, res) => {
    try {
      res.sendFile(path.resolve('./client/admin/index.html'));
    } catch (error) {
      // Fallback admin interface
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KitchenOff Admin</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .container { max-width: 400px; margin: 50px auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
    h1 { color: #333; margin-bottom: 30px; text-align: center; font-size: 28px; }
    .logo { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: bold; color: #667eea; }
    .info { background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea; }
    .credentials { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; }
    .button { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; width: 100%; text-align: center; font-size: 16px; margin-top: 20px; }
    .button:hover { background: #5a6fd8; }
    .note { font-size: 14px; color: #666; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🍴 KitchenOff</div>
    <h1>Admin Panel</h1>
    <div class="info">
      <p><strong>Admin Credentials:</strong></p>
      <div class="credentials">Email: admin@kitchen-off.com</div>
      <div class="credentials">Password: admin123</div>
    </div>
    <p>Welcome to the KitchenOff admin interface. Please use the credentials above to access your dashboard.</p>
    <a href="/admin" class="button">Enter Admin Panel</a>
    <div class="note">
      <p>🔐 Features: JWT Authentication, 2FA Support, Real-time Dashboard</p>
    </div>
  </div>
  <script>
    // Redirect to admin interface after showing credentials
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  </script>
</body>
</html>`);
    }
  });

  // Admin UI routes (non-API routes only)
  app.get('/admin', (req, res) => {
    try {
      res.sendFile(path.resolve('./client/admin/index.html'));
    } catch (error) {
      res.redirect('/admin');
    }
  });

  const httpServer = createServer(app);
  
  // Load all data into memory after server setup
  setTimeout(loadAllDataIntoMemory, 2000); // Wait 2 seconds for database to be ready
  
  return httpServer;
}
