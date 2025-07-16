import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { upload, processImages, serveUploads, deleteUploadedFile } from "./upload-middleware";
import { loadAllDataIntoMemory } from "./routes";

// Rate limiting for admin login attempts
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for 2FA attempts
const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: { message: "Too many 2FA attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

interface AdminAuthRequest extends Request {
  adminId?: number;
  admin?: any;
}

// Admin authentication middleware
const authenticateAdmin = async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as { id?: number; adminId?: number; isAdmin?: boolean };
    
    // Support both token structures: regular admin tokens (with id) and admin-specific tokens (with adminId)
    const userId = decoded.id || decoded.adminId;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token structure" });
    }

    const admin = await storage.getUser(userId);
    
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({ message: "Admin access denied" });
    }

    req.adminId = userId;
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid admin token" });
  }
};

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

export async function registerAdminRoutes(app: Express) {
  // Serve uploaded files
  app.get("/uploads/products/:filename", serveUploads);

  // Image upload endpoint
  app.post("/admin/api/upload-images", authenticateAdmin, upload.array('images', 10), processImages, async (req: AdminAuthRequest, res: Response) => {
    try {
      if (!req.processedFiles || req.processedFiles.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No files uploaded" 
        });
      }

      res.json({
        success: true,
        message: `${req.processedFiles.length} image(s) uploaded successfully`,
        files: req.processedFiles
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error uploading images" 
      });
    }
  });

  // Delete image endpoint
  app.delete("/admin/api/delete-image/:filename", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { filename } = req.params;
      const deleted = await deleteUploadedFile(filename);
      
      if (deleted) {
        res.json({ success: true, message: "Image deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "Image not found" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ success: false, message: "Error deleting image" });
    }
  });

  // Admin login endpoint
  app.post("/admin/api/login", adminLoginLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find admin user
      const admin = await storage.getUserByEmail(email);
      if (!admin || !admin.isAdmin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // Check if 2FA is enabled
      if (admin.twoFactorEnabled) {
        // Generate a temporary token for 2FA verification
        const tempToken = jwt.sign(
          { adminId: admin.id, stage: "2fa_required" },
          process.env.JWT_SECRET || "fallback-secret",
          { expiresIn: "10m" }
        );
        
        return res.json({
          message: "2FA verification required",
          tempToken,
          requiresTwoFactor: true
        });
      }

      // Generate access token
      const token = jwt.sign(
        { adminId: admin.id },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "24h" }
      );

      res.json({
        message: "Admin login successful",
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          twoFactorEnabled: admin.twoFactorEnabled
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 2FA verification endpoint
  app.post("/admin/api/verify-2fa", twoFactorLimiter, async (req: Request, res: Response) => {
    try {
      const { tempToken, code, backupCode } = req.body;
      
      if (!tempToken || (!code && !backupCode)) {
        return res.status(400).json({ message: "Temporary token and verification code are required" });
      }

      // Verify temporary token
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || "fallback-secret") as { adminId: number, stage: string };
      
      if (decoded.stage !== "2fa_required") {
        return res.status(401).json({ message: "Invalid verification stage" });
      }

      const admin = await storage.getUser(decoded.adminId);
      if (!admin || !admin.isAdmin || !admin.twoFactorEnabled) {
        return res.status(401).json({ message: "Invalid admin or 2FA not enabled" });
      }

      let isValid = false;

      if (backupCode) {
        // Verify backup code
        const backupCodes = admin.twoFactorBackupCodes as string[] || [];
        const codeIndex = backupCodes.indexOf(backupCode.toUpperCase());
        
        if (codeIndex !== -1) {
          isValid = true;
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await storage.updateUser(admin.id, { twoFactorBackupCodes: backupCodes });
        }
      } else if (code) {
        // Verify TOTP code
        isValid = speakeasy.totp.verify({
          secret: admin.twoFactorSecret!,
          encoding: 'base32',
          token: code,
          window: 2
        });
      }

      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Generate final access token
      const token = jwt.sign(
        { adminId: admin.id },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "24h" }
      );

      res.json({
        message: "2FA verification successful",
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          twoFactorEnabled: admin.twoFactorEnabled
        }
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enable 2FA endpoint
  app.post("/admin/api/enable-2fa", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      if (req.admin.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `KitchenOff Admin (${req.admin.email})`,
        issuer: 'KitchenOff',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
      
      // Store secret temporarily (not yet enabled)
      await storage.updateUser(req.admin.id, { twoFactorSecret: secret.base32 });

      res.json({
        message: "2FA setup initiated",
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      });
    } catch (error) {
      console.error("Enable 2FA error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Confirm 2FA setup
  app.post("/admin/api/confirm-2fa", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      if (!req.admin || !req.admin.twoFactorSecret) {
        return res.status(400).json({ message: "2FA setup not initiated" });
      }

      // Verify the code
      const isValid = speakeasy.totp.verify({
        secret: req.admin.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes();

      // Enable 2FA
      await storage.updateUser(req.admin.id, {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes
      });

      res.json({
        message: "2FA enabled successfully",
        backupCodes
      });
    } catch (error) {
      console.error("Confirm 2FA error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Disable 2FA endpoint
  app.post("/admin/api/disable-2fa", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { code, backupCode } = req.body;
      
      if (!code && !backupCode) {
        return res.status(400).json({ message: "Verification code or backup code is required" });
      }

      if (!req.admin || !req.admin.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is not enabled" });
      }

      let isValid = false;

      if (backupCode) {
        // Verify backup code
        const backupCodes = req.admin.twoFactorBackupCodes as string[] || [];
        isValid = backupCodes.includes(backupCode.toUpperCase());
      } else if (code) {
        // Verify TOTP code
        isValid = speakeasy.totp.verify({
          secret: req.admin.twoFactorSecret!,
          encoding: 'base32',
          token: code,
          window: 2
        });
      }

      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Disable 2FA
      await storage.updateUser(req.admin.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: []
      });

      res.json({ message: "2FA disabled successfully" });
    } catch (error) {
      console.error("Disable 2FA error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get admin profile
  app.get("/admin/api/profile", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      res.json({
        id: req.admin.id,
        email: req.admin.email,
        firstName: req.admin.firstName,
        lastName: req.admin.lastName,
        twoFactorEnabled: req.admin.twoFactorEnabled
      });
    } catch (error) {
      console.error("Get admin profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin dashboard stats
  app.get("/admin/api/stats", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      console.log("Admin stats endpoint called");
      const totalUsers = await storage.getTotalUsers();
      const totalOrders = await storage.getTotalOrders();
      const totalProducts = await storage.getTotalProducts();
      const recentOrders = await storage.getRecentOrders(10);

      res.json({
        totalUsers,
        totalOrders,
        totalProducts,
        recentOrders
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin logout
  app.post("/admin/api/logout", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      // In a real implementation, you might want to blacklist the token
      res.json({ message: "Admin logout successful" });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin User Management Routes
  app.get("/admin/api/users", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/admin/api/users", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { email, password, firstName, lastName, isAdmin = false } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isAdmin
      });

      res.json({ message: "User created successfully", user: { id: newUser.id, email: newUser.email } });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/admin/api/users/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { email, firstName, lastName, isAdmin } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        email,
        firstName,
        lastName,
        isAdmin
      });

      res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/admin/api/users/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting own account
      if (userId === req.adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin Order Management Routes
  app.get("/admin/api/orders", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      const orders = await storage.getOrders();
      
      let filteredOrders = orders;
      if (status) {
        filteredOrders = orders.filter(order => order.status === status);
      }
      
      const paginatedOrders = filteredOrders.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json(paginatedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Bulk update order status (must come before individual endpoint)
  app.put("/admin/api/orders/bulk/status", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderIds, status } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const results = [];
      for (const orderId of orderIds) {
        try {
          const parsedOrderId = parseInt(orderId);
          if (isNaN(parsedOrderId)) {
            results.push({ orderId, success: false, error: "Invalid order ID" });
            continue;
          }
          const order = await storage.updateOrderStatus(parsedOrderId, status);
          results.push({ orderId, success: true, order });
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
      
      res.json({ 
        message: `Bulk status update completed`,
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      });
    } catch (error) {
      console.error("Bulk update order status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual order details
  app.get("/admin/api/orders/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Invalid order ID' });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, order });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch order' });
    }
  });

  // Individual order status update
  app.put("/admin/api/orders/:id/status", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'accepted'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      res.json({ message: "Order status updated successfully", order: updatedOrder });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Accept order with email notifications
  app.post("/admin/api/orders/:id/accept", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, message: 'Invalid order ID' });
      }

      // Get the order details first
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check if order is already accepted
      if (order.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Order is already accepted' });
      }

      // Accept the order
      const updatedOrder = await storage.acceptOrder(orderId);
      
      // Get user details for email
      const user = await storage.getUser(order.userId!);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Import email functions
      const { sendOrderConfirmationEmail, sendLogisticsNotificationEmail } = await import('./email-service');
      
      // Send confirmation email to customer
      const customerEmailSent = await sendOrderConfirmationEmail(order, user);
      
      // Send notification to logistics
      const logisticsEmailSent = await sendLogisticsNotificationEmail(order, user);

      res.json({
        success: true,
        message: "Order accepted successfully",
        order: updatedOrder,
        notifications: {
          customerEmail: customerEmailSent,
          logisticsEmail: logisticsEmailSent
        }
      });
    } catch (error) {
      console.error("Error accepting order:", error);
      res.status(500).json({ success: false, message: "Failed to accept order" });
    }
  });

  // Generate shipping labels (simulation)
  app.post("/admin/api/orders/bulk/shipping-labels", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderIds } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      const results = [];
      for (const orderId of orderIds) {
        try {
          const parsedOrderId = parseInt(orderId);
          if (isNaN(parsedOrderId)) {
            results.push({ orderId, success: false, error: "Invalid order ID" });
            continue;
          }
          const order = await storage.getOrder(parsedOrderId);
          if (order) {
            results.push({ 
              orderId, 
              success: true, 
              trackingNumber: `KO${Date.now()}${orderId}`,
              shippingLabel: `shipping_label_${orderId}.pdf`
            });
          } else {
            results.push({ orderId, success: false, error: "Order not found" });
          }
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
      
      res.json({ 
        message: `Shipping labels generated`,
        results,
        successCount: results.filter(r => r.success).length
      });
    } catch (error) {
      console.error("Generate shipping labels error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send bulk notifications (simulation)
  app.post("/admin/api/orders/bulk/notifications", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderIds, notificationType, message } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      if (!notificationType || !['order_update', 'shipping_notification', 'delivery_confirmation'].includes(notificationType)) {
        return res.status(400).json({ message: "Invalid notification type" });
      }
      
      const results = [];
      for (const orderId of orderIds) {
        try {
          const parsedOrderId = parseInt(orderId);
          if (isNaN(parsedOrderId)) {
            results.push({ orderId, success: false, error: "Invalid order ID" });
            continue;
          }
          const order = await storage.getOrder(parsedOrderId);
          if (order) {
            results.push({ 
              orderId, 
              success: true, 
              notificationType,
              sentTo: `user_${order.userId}@example.com`,
              message: message || `Your order #${orderId} has been updated.`
            });
          } else {
            results.push({ orderId, success: false, error: "Order not found" });
          }
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
      
      res.json({ 
        message: `Bulk notifications sent`,
        results,
        successCount: results.filter(r => r.success).length
      });
    } catch (error) {
      console.error("Send bulk notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process bulk refunds (simulation)
  app.post("/admin/api/orders/bulk/refunds", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderIds, refundAmount, reason } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      const results = [];
      for (const orderId of orderIds) {
        try {
          const parsedOrderId = parseInt(orderId);
          if (isNaN(parsedOrderId)) {
            results.push({ orderId, success: false, error: "Invalid order ID" });
            continue;
          }
          const order = await storage.getOrder(parsedOrderId);
          if (order) {
            const refundAmt = refundAmount || order.totalAmount;
            results.push({ 
              orderId, 
              success: true, 
              refundAmount: refundAmt,
              reason: reason || "Admin initiated refund",
              transactionId: `REF${Date.now()}${orderId}`
            });
          } else {
            results.push({ orderId, success: false, error: "Order not found" });
          }
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
      
      res.json({ 
        message: `Bulk refunds processed`,
        results,
        successCount: results.filter(r => r.success).length,
        totalRefunded: results.filter(r => r.success).reduce((sum, r) => sum + parseFloat(r.refundAmount), 0)
      });
    } catch (error) {
      console.error("Process bulk refunds error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Product Management Routes
  app.get("/admin/api/products", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { search, categoryId, featured, limit = 50, offset = 0 } = req.query;
      
      const products = await storage.getProducts({
        search: search as string,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        featured: featured === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/admin/api/products", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const productData = req.body;
      
      if (!productData.name || !productData.price) {
        return res.status(400).json({ message: "Name and price are required" });
      }

      // Generate slug from name
      const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      const newProduct = await storage.createProduct({
        ...productData,
        slug,
        price: parseFloat(productData.price),
        compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : undefined,
        stockQuantity: parseInt(productData.stockQuantity || 0)
      });

      res.json({ message: "Product created successfully", product: newProduct });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/admin/api/products/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = req.body;
      
      const updatedProduct = await storage.updateProduct(productId, {
        ...productData,
        price: productData.price ? parseFloat(productData.price) : undefined,
        compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : undefined,
        stockQuantity: productData.stockQuantity ? parseInt(productData.stockQuantity) : undefined,
        images: productData.images || []  // Ensure images are properly saved
      });

      // Note: Memory cache will be refreshed periodically, no need to refresh immediately

      res.json({ message: "Product updated successfully", product: updatedProduct });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/admin/api/products/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      
      await storage.deleteProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin Category Management Routes
  app.get("/admin/api/categories", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/admin/api/categories", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { name, description, imageUrl } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      const newCategory = await storage.createCategory({
        name,
        slug,
        description,
        imageUrl
      });

      res.json({ message: "Category created successfully", category: newCategory });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/admin/api/categories/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { name, description, imageUrl } = req.body;
      
      const updatedCategory = await storage.updateCategory(categoryId, {
        name,
        description,
        imageUrl
      });

      res.json({ message: "Category updated successfully", category: updatedCategory });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/admin/api/categories/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      await storage.deleteCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product Bulk Operations
  app.put("/admin/api/products/bulk/prices", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds, multiplier, fixedPrice } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      const results = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            let newPrice = product.price;
            if (multiplier) {
              newPrice = product.price * multiplier;
            } else if (fixedPrice) {
              newPrice = fixedPrice;
            }
            
            await storage.updateProduct(parseInt(productId), { price: newPrice });
            results.push({ id: productId, success: true, newPrice });
          } else {
            results.push({ id: productId, success: false, message: "Product not found" });
          }
        } catch (error) {
          results.push({ id: productId, success: false, message: error.message });
        }
      }
      
      // Refresh memory cache after bulk operations
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: `Price update completed for ${productIds.length} products`,
        results
      });
    } catch (error) {
      console.error("Error updating product prices:", error);
      res.status(500).json({ message: "Failed to update product prices" });
    }
  });

  app.put("/admin/api/products/bulk/categories", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds, categoryId } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      if (!categoryId) {
        return res.status(400).json({ message: "Category ID is required" });
      }
      
      const results = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            await storage.updateProduct(parseInt(productId), { categoryId: parseInt(categoryId) });
            results.push({ id: productId, success: true });
          } else {
            results.push({ id: productId, success: false, message: "Product not found" });
          }
        } catch (error) {
          results.push({ id: productId, success: false, message: error.message });
        }
      }
      
      // Refresh memory cache after bulk operations
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: `Category update completed for ${productIds.length} products`,
        results
      });
    } catch (error) {
      console.error("Error updating product categories:", error);
      res.status(500).json({ message: "Failed to update product categories" });
    }
  });

  app.put("/admin/api/products/bulk/status", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds, status } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const results = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            await storage.updateProduct(parseInt(productId), { status });
            results.push({ id: productId, success: true });
          } else {
            results.push({ id: productId, success: false, message: "Product not found" });
          }
        } catch (error) {
          results.push({ id: productId, success: false, message: error.message });
        }
      }
      
      // Refresh memory cache after bulk operations
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: `Status update completed for ${productIds.length} products`,
        results
      });
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Failed to update product status" });
    }
  });

  app.put("/admin/api/products/bulk/stock", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds, operation, value } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      if (!operation || !value) {
        return res.status(400).json({ message: "Operation and value are required" });
      }
      
      const results = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            let newStock = product.stockQuantity || 0;
            
            switch (operation) {
              case 'set':
                newStock = value;
                break;
              case 'add':
                newStock += value;
                break;
              case 'subtract':
                newStock = Math.max(0, newStock - value);
                break;
              default:
                throw new Error('Invalid operation');
            }
            
            await storage.updateProduct(parseInt(productId), { stockQuantity: newStock });
            results.push({ id: productId, success: true, newStock });
          } else {
            results.push({ id: productId, success: false, message: "Product not found" });
          }
        } catch (error) {
          results.push({ id: productId, success: false, message: error.message });
        }
      }
      
      // Refresh memory cache after bulk operations
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: `Stock update completed for ${productIds.length} products`,
        results
      });
    } catch (error) {
      console.error("Error updating product stock:", error);
      res.status(500).json({ message: "Failed to update product stock" });
    }
  });

  app.put("/admin/api/products/bulk/export", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      const products = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            products.push(product);
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error);
        }
      }
      
      // Generate CSV content
      const csvHeader = "ID,Name,Price,Category,Stock,VAT%,Product Code,NC Code,CPV Code,Description\n";
      const csvRows = products.map(product => 
        `${product.id},"${product.name}",${product.price},"${product.category?.name || 'N/A'}",${product.stockQuantity || 0},${product.vatValue || 0},"${product.productCode || ''}","${product.ncCode || ''}","${product.cpvCode || ''}","${product.description || ''}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ message: "Failed to export products" });
    }
  });

  app.put("/admin/api/products/bulk/delete", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { productIds } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      const results = [];
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(parseInt(productId));
          if (product) {
            await storage.deleteProduct(parseInt(productId));
            results.push({ id: productId, success: true });
          } else {
            results.push({ id: productId, success: false, message: "Product not found" });
          }
        } catch (error) {
          results.push({ id: productId, success: false, message: error.message });
        }
      }
      
      // Refresh memory cache after bulk operations
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: `Delete operation completed for ${productIds.length} products`,
        results
      });
    } catch (error) {
      console.error("Error deleting products:", error);
      res.status(500).json({ message: "Failed to delete products" });
    }
  });

  // Supplier routes
  app.get("/admin/api/suppliers", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/admin/api/suppliers", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { name, email, phone, address, city, state, zipCode, country, contactPerson, apiEndpoint, apiKey, integrationType, notes, isActive } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      const supplier = await storage.createSupplier({
        name,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        contactPerson,
        apiEndpoint,
        apiKey,
        integrationType: integrationType || 'email',
        notes,
        isActive: isActive !== undefined ? isActive : true
      });
      
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/admin/api/suppliers/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, email, phone, address, city, state, zipCode, country, contactPerson, apiEndpoint, apiKey, integrationType, notes, isActive } = req.body;
      
      const supplier = await storage.updateSupplier(parseInt(id), {
        name,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        contactPerson,
        apiEndpoint,
        apiKey,
        integrationType,
        notes,
        isActive
      });
      
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/admin/api/suppliers/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteSupplier(parseInt(id));
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });
}