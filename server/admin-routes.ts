import type { Express } from "express";
import { storage } from "./storage";
import { db, pool } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { upload, processImages, serveUploads, deleteUploadedFile } from "./upload-middleware";
import { loadAllDataIntoMemory } from "./routes";
import multer from "multer";
import * as XLSX from "xlsx";

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
    const authHeader = req.headers.authorization;
    console.log("Auth header received:", authHeader);
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      console.log("No token provided");
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

// Supplier API synchronization helper functions
async function simulateSupplierDeliverySync(supplier: any, deliveryUpdate: any) {
  // Simulate API call based on supplier's integration type
  switch (supplier.integrationType) {
    case 'api':
      if (supplier.apiEndpoint && supplier.apiKey) {
        // Simulate REST API call
        return {
          success: true,
          method: 'POST',
          endpoint: `${supplier.apiEndpoint}/delivery/update`,
          response: {
            orderId: deliveryUpdate.orderId,
            status: deliveryUpdate.deliveryStatus,
            trackingNumber: deliveryUpdate.trackingNumber,
            estimatedDelivery: deliveryUpdate.estimatedDelivery,
            supplierResponse: "Delivery status updated successfully"
          }
        };
      }
      break;
    case 'email':
      // Simulate email notification
      return {
        success: true,
        method: 'EMAIL',
        recipient: supplier.email,
        response: {
          subject: `Delivery Update for Order #${deliveryUpdate.orderId}`,
          message: `Delivery status: ${deliveryUpdate.deliveryStatus}`,
          sent: true
        }
      };
    case 'manual':
      // Manual process - just log the update
      return {
        success: true,
        method: 'MANUAL',
        response: {
          message: "Manual delivery update logged",
          requiresHumanAction: true
        }
      };
    default:
      return {
        success: false,
        message: "Unknown integration type"
      };
  }
}

async function fetchSupplierDeliveryStatus(supplier: any, orderId: string) {
  // Simulate fetching delivery status from supplier's system
  const mockStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
  
  return {
    orderId,
    supplierId: supplier.id,
    supplierName: supplier.name,
    deliveryStatus: randomStatus,
    trackingNumber: `TRK${Date.now()}`,
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date().toISOString(),
    integrationType: supplier.integrationType,
    apiEndpoint: supplier.apiEndpoint
  };
}

// Fetch updated prices from supplier's API
async function fetchSupplierPrices(supplier: any) {
  // Simulate API call to fetch prices from supplier
  const mockPriceUpdates = [
    { productId: 7537, price: 125.99, compareAtPrice: 149.99, stockQuantity: 15 },
    { productId: 7536, price: 89.99, compareAtPrice: 109.99, stockQuantity: 22 },
    { productId: 7535, price: 34.99, compareAtPrice: 39.99, stockQuantity: 45 }
  ];

  if (supplier.integrationType === 'api' && supplier.apiEndpoint) {
    // In real implementation, make HTTP request to supplier's API
    // const response = await fetch(`${supplier.apiEndpoint}/prices`, {
    //   headers: { 'Authorization': `Bearer ${supplier.apiKey}` }
    // });
    // return await response.json();
    
    return mockPriceUpdates;
  }
  
  return mockPriceUpdates;
}

// Fetch updated stock from supplier's API
async function fetchSupplierStock(supplier: any) {
  // Simulate API call to fetch stock from supplier
  const mockStockUpdates = [
    { productId: 7537, stockQuantity: 18 },
    { productId: 7536, stockQuantity: 25 },
    { productId: 7535, stockQuantity: 42 },
    { productId: 7534, stockQuantity: 8 }
  ];

  if (supplier.integrationType === 'api' && supplier.apiEndpoint) {
    // In real implementation, make HTTP request to supplier's API
    // const response = await fetch(`${supplier.apiEndpoint}/stock`, {
    //   headers: { 'Authorization': `Bearer ${supplier.apiKey}` }
    // });
    // return await response.json();
    
    return mockStockUpdates;
  }
  
  return mockStockUpdates;
}

// Forward order to supplier
async function forwardOrderToSupplier(supplier: any, orderData: any) {
  try {
    switch (supplier.integrationType) {
      case 'api':
        if (supplier.apiEndpoint && supplier.apiKey) {
          // In real implementation, make HTTP request to supplier's API
          // const response = await fetch(`${supplier.apiEndpoint}/orders`, {
          //   method: 'POST',
          //   headers: { 
          //     'Authorization': `Bearer ${supplier.apiKey}`,
          //     'Content-Type': 'application/json'
          //   },
          //   body: JSON.stringify(orderData)
          // });
          
          return {
            success: true,
            method: 'API',
            endpoint: `${supplier.apiEndpoint}/orders`,
            data: {
              orderId: orderData.orderId,
              supplierOrderId: `SUP-${Date.now()}`,
              status: 'forwarded',
              message: 'Order successfully forwarded to supplier API',
              items: orderData.items.length,
              totalAmount: orderData.items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice), 0)
            }
          };
        }
        break;
        
      case 'email':
        // Format order for email
        const emailContent = {
          to: supplier.email,
          subject: `New Order #${orderData.orderId} - ${supplier.name}`,
          html: `
            <h2>New Order Received</h2>
            <p><strong>Order ID:</strong> ${orderData.orderId}</p>
            <p><strong>Order Date:</strong> ${orderData.orderDate}</p>
            
            <h3>Delivery Address:</h3>
            <p>${orderData.shippingAddress.name}<br>
            ${orderData.shippingAddress.street}<br>
            ${orderData.shippingAddress.city}, ${orderData.shippingAddress.zipCode}<br>
            ${orderData.shippingAddress.country}</p>
            
            <h3>Order Items:</h3>
            <table border="1" style="border-collapse: collapse;">
              <tr>
                <th>Product</th>
                <th>Code</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
              ${orderData.items.map((item: any) => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.productCode || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>€${item.price}</td>
                  <td>€${item.totalPrice}</td>
                </tr>
              `).join('')}
            </table>
            
            <p><strong>Instructions:</strong> ${orderData.supplierInstructions}</p>
          `
        };
        
        return {
          success: true,
          method: 'EMAIL',
          data: {
            orderId: orderData.orderId,
            recipient: supplier.email,
            subject: emailContent.subject,
            status: 'sent',
            message: 'Order details sent via email'
          }
        };
        
      case 'manual':
        return {
          success: true,
          method: 'MANUAL',
          data: {
            orderId: orderData.orderId,
            status: 'logged',
            message: 'Order logged for manual processing',
            requiresHumanAction: true
          }
        };
        
      default:
        return {
          success: false,
          message: 'Unknown integration type'
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to forward order: ${error.message}`
    };
  }
}

async function performSupplierSync(supplier: any, order: any, action: string) {
  try {
    switch (action) {
      case 'fetch_status':
        const status = await fetchSupplierDeliveryStatus(supplier, order.id.toString());
        return {
          success: true,
          message: "Delivery status fetched successfully",
          data: status
        };
      
      case 'update_delivery':
        const updateResult = await simulateSupplierDeliverySync(supplier, {
          orderId: order.id,
          deliveryStatus: 'processing',
          trackingNumber: `TRK${Date.now()}`,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        });
        return {
          success: true,
          message: "Delivery status updated with supplier",
          data: updateResult
        };
      
      case 'notify_suppliers':
        // Send notification to supplier about order
        const notificationResult = await simulateSupplierDeliverySync(supplier, {
          orderId: order.id,
          deliveryStatus: 'notification',
          message: `New order #${order.id} requires processing`
        });
        return {
          success: true,
          message: "Supplier notified successfully",
          data: notificationResult
        };
      
      default:
        return {
          success: false,
          message: "Unknown sync action"
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${error.message}`
    };
  }
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
      const { status, limit = 50, offset = 0, supplierId } = req.query;
      
      const orders = await storage.getOrders();
      
      let filteredOrders = orders;
      if (status) {
        filteredOrders = orders.filter(order => order.status === status);
      }
      
      // Filter by supplier if specified
      if (supplierId) {
        filteredOrders = filteredOrders.filter(order => 
          (order as any).orderItems && (order as any).orderItems.some((item: any) => item.supplierId === parseInt(supplierId as string))
        );
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

      // Check if order is already processed
      if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
        return res.status(400).json({ success: false, message: 'Order has already been processed' });
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

  // Smartbill Credentials Management
  app.get("/admin/api/smartbill/credentials", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      // Return current credentials (masked for security)
      const credentials = {
        username: process.env.SMARTBILL_USERNAME,
        token: process.env.SMARTBILL_TOKEN ? process.env.SMARTBILL_TOKEN.substring(0, 10) + '...' : 'Not set',
        companyVat: process.env.SMARTBILL_COMPANY_VAT,
        series: process.env.SMARTBILL_SERIES,
        enabled: process.env.ENABLE_SMARTBILL === 'true'
      };
      
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching Smartbill credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post("/admin/api/smartbill/test-credentials", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { username, token } = req.body;
      
      if (!username || !token) {
        return res.status(400).json({ message: "Username and token are required" });
      }

      // Test the provided credentials
      const credentials = Buffer.from(`${username}:${token}`).toString('base64');
      const response = await fetch('https://ws.smartbill.ro/SBORO/api/series', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        res.json({
          success: true,
          message: 'Credentials are valid!',
          availableSeries: result.map((s: any) => ({ name: s.name, type: s.type }))
        });
      } else {
        const errorText = await response.text();
        res.json({
          success: false,
          message: 'Authentication failed',
          error: errorText
        });
      }
    } catch (error) {
      console.error("Error testing Smartbill credentials:", error);
      res.status(500).json({ 
        success: false,
        message: "Connection error",
        error: error.message 
      });
    }
  });

  app.post("/admin/api/smartbill/create-series", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { seriesName, startNumber = 1 } = req.body;
      
      if (!seriesName) {
        return res.status(400).json({ message: "Series name is required" });
      }

      // Test creating a new series via Smartbill API
      const credentials = Buffer.from(`${process.env.SMARTBILL_USERNAME}:${process.env.SMARTBILL_TOKEN}`).toString('base64');
      
      const seriesData = {
        name: seriesName,
        startNumber: startNumber,
        type: 'factura' // Invoice type
      };
      
      const response = await fetch('https://ws.smartbill.ro/SBORO/api/series', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(seriesData)
      });

      if (response.ok) {
        const result = await response.json();
        res.json({
          success: true,
          message: `Series ${seriesName} created successfully`,
          series: result
        });
      } else {
        const errorText = await response.text();
        res.json({
          success: false,
          message: "Series creation not supported via API",
          note: "Create new series manually in Smartbill Dashboard: Settings > Document Series"
        });
      }
      
    } catch (error) {
      console.error("Error creating series:", error);
      res.status(500).json({ message: "Failed to create series" });
    }
  });

  app.post("/admin/api/smartbill/update-credentials", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { username, token, companyVat, series } = req.body;
      
      if (!username || !token) {
        return res.status(400).json({ message: "Username and token are required" });
      }

      // Test credentials before updating
      const credentials = Buffer.from(`${username}:${token}`).toString('base64');
      const testResponse = await fetch('https://ws.smartbill.ro/SBORO/api/series', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        }
      });

      if (!testResponse.ok) {
        return res.status(400).json({
          message: "Invalid credentials",
          error: "Authentication test failed"
        });
      }

      // Update environment variables (this would require a restart in production)
      process.env.SMARTBILL_USERNAME = username;
      process.env.SMARTBILL_TOKEN = token;
      if (companyVat) process.env.SMARTBILL_COMPANY_VAT = companyVat;
      if (series) process.env.SMARTBILL_SERIES = series;
      
      const result = await testResponse.json();
      
      res.json({
        success: true,
        message: "Credentials updated successfully!",
        note: "Credentials updated for current session. For permanent changes, update your Replit Secrets.",
        availableSeries: result.map((s: any) => ({ name: s.name, type: s.type }))
      });
      
    } catch (error) {
      console.error("Error updating Smartbill credentials:", error);
      res.status(500).json({ message: "Failed to update credentials" });
    }
  });

  // Admin Product Management Routes
  app.get("/admin/api/products", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { search, categoryId, featured, limit = 50, offset = 0, supplierId } = req.query;
      
      const products = await storage.getProducts({
        search: search as string,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        featured: featured === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      // Filter by supplier if specified
      let filteredProducts = products;
      if (supplierId) {
        filteredProducts = products.filter(product => product.supplierId === parseInt(supplierId as string));
      }

      res.json(filteredProducts);
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
        stockQuantity: parseInt(productData.stockQuantity || 0),
        // Convert logistics fields properly - weight must be minimum 1kg with 1kg increments
        weight: productData.weight && productData.weight.trim() !== '' ? Math.max(1, Math.round(parseFloat(productData.weight))) : null,
        length: productData.length && productData.length.trim() !== '' ? parseFloat(productData.length) : null,
        width: productData.width && productData.width.trim() !== '' ? parseFloat(productData.width) : null,
        height: productData.height && productData.height.trim() !== '' ? parseFloat(productData.height) : null
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
      
      console.log(`Updating product ${productId} with data:`, productData);
      console.log('Currency field:', productData.currency);
      console.log('VAT percentage field:', productData.vatPercentage);
      
      const updatedProduct = await storage.updateProduct(productId, {
        ...productData,
        price: productData.price ? parseFloat(productData.price) : undefined,
        compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : undefined,
        stockQuantity: productData.stockQuantity ? parseInt(productData.stockQuantity) : undefined,
        images: productData.images || [],  // Ensure images are properly saved
        // Convert logistics fields properly - weight must be minimum 1kg with 1kg increments
        weight: productData.weight && productData.weight.trim() !== '' ? Math.max(1, Math.round(parseFloat(productData.weight))) : null,
        length: productData.length && productData.length.trim() !== '' ? parseFloat(productData.length) : null,
        width: productData.width && productData.width.trim() !== '' ? parseFloat(productData.width) : null,
        height: productData.height && productData.height.trim() !== '' ? parseFloat(productData.height) : null
      });
      
      console.log('Updated product result:', updatedProduct);

      res.json({ 
        message: "Product updated successfully", 
        product: updatedProduct,
        // Signal to frontend that data should be refreshed
        refreshRequired: true
      });
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

  // Category image upload endpoint
  app.post("/admin/api/categories/:id/upload-image", authenticateAdmin, upload.single('image'), processImages, async (req: AdminAuthRequest, res: Response) => {
    try {
      console.log("Category image upload request received");
      console.log("Category ID:", req.params.id);
      console.log("Admin user:", req.admin?.email);
      console.log("Files received:", req.file ? "Yes" : "No");
      console.log("Processed files:", req.processedFiles?.length || 0);
      
      const categoryId = parseInt(req.params.id);
      
      if (!req.processedFiles || req.processedFiles.length === 0) {
        console.log("No processed files found");
        return res.status(400).json({ message: "No image file provided" });
      }

      const processedFile = req.processedFiles[0];
      console.log("Processed file URL:", processedFile.url);
      
      // Update category with new image URL
      const updatedCategory = await storage.updateCategory(categoryId, {
        imageUrl: processedFile.url
      });

      console.log("Category updated successfully:", updatedCategory);

      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: "Category image uploaded successfully", 
        category: updatedCategory,
        imageUrl: processedFile.url,
        thumbnailUrl: processedFile.thumbnailUrl
      });
    } catch (error) {
      console.error("Error uploading category image:", error);
      res.status(500).json({ message: "Failed to upload category image" });
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
              newPrice = parseFloat(product.price) * multiplier;
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

  app.get("/admin/api/suppliers/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const supplier = await storage.getSupplier(parseInt(id));
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
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

  // Supplier bulk operations
  app.post("/admin/api/suppliers/bulk", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { operation, supplierIds, ...operationData } = req.body;
      
      if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
        return res.status(400).json({ message: "No suppliers selected" });
      }

      let processed = 0;
      let success = 0;
      let failed = 0;
      let message = "";

      for (const supplierId of supplierIds) {
        try {
          processed++;
          
          switch (operation) {
            case 'activate':
              await storage.updateSupplier(supplierId, { isActive: true });
              success++;
              break;
              
            case 'deactivate':
              await storage.updateSupplier(supplierId, { isActive: false });
              success++;
              break;
              
            case 'status':
              await storage.updateSupplier(supplierId, { isActive: operationData.status === 'active' });
              success++;
              break;
              
            case 'sync-prices':
              // This would normally call the supplier's API to sync prices
              // For now, we'll simulate the operation
              console.log(`Syncing prices for supplier ${supplierId}`);
              success++;
              break;
              
            case 'sync-stock':
              // This would normally call the supplier's API to sync stock
              // For now, we'll simulate the operation
              console.log(`Syncing stock for supplier ${supplierId}`);
              success++;
              break;
              
            case 'delete':
              await storage.deleteSupplier(supplierId);
              success++;
              break;
              
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        } catch (error) {
          console.error(`Error processing supplier ${supplierId}:`, error);
          failed++;
        }
      }

      // Set appropriate message based on operation
      switch (operation) {
        case 'activate':
          message = `Successfully activated ${success} supplier(s)`;
          break;
        case 'deactivate':
          message = `Successfully deactivated ${success} supplier(s)`;
          break;
        case 'status':
          message = `Successfully updated status for ${success} supplier(s)`;
          break;
        case 'sync-prices':
          message = `Successfully synced prices for ${success} supplier(s)`;
          break;
        case 'sync-stock':
          message = `Successfully synced stock for ${success} supplier(s)`;
          break;
        case 'delete':
          message = `Successfully deleted ${success} supplier(s)`;
          break;
        default:
          message = `Successfully processed ${success} supplier(s)`;
      }

      if (failed > 0) {
        message += ` (${failed} failed)`;
      }

      res.json({
        message,
        processed,
        success,
        failed,
        operation
      });
    } catch (error) {
      console.error("Error in supplier bulk operation:", error);
      res.status(500).json({ message: "Failed to perform bulk operation" });
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

  // Supplier price and stock synchronization endpoints
  app.post("/admin/api/suppliers/:id/sync-prices", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const supplier = await storage.getSupplier(parseInt(id));
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Fetch updated prices from supplier's API
      const priceUpdates = await fetchSupplierPrices(supplier);
      
      // Update products with new prices
      const updateResults = [];
      for (const update of priceUpdates) {
        try {
          const product = await storage.getProduct(update.productId);
          if (product && product.supplierId === parseInt(id)) {
            await storage.updateProduct(update.productId, {
              price: update.price.toString(),
              compareAtPrice: update.compareAtPrice?.toString(),
              stockQuantity: update.stockQuantity
            });
            updateResults.push({
              productId: update.productId,
              productName: product.name,
              oldPrice: product.price,
              newPrice: update.price,
              oldStock: product.stockQuantity,
              newStock: update.stockQuantity,
              success: true
            });
          }
        } catch (error) {
          updateResults.push({
            productId: update.productId,
            success: false,
            error: error.message
          });
        }
      }

      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({
        success: true,
        message: `Updated prices for ${updateResults.filter(r => r.success).length} products`,
        data: updateResults
      });
    } catch (error) {
      console.error("Error syncing prices:", error);
      res.status(500).json({ message: "Failed to sync prices with supplier" });
    }
  });

  app.post("/admin/api/suppliers/:id/sync-stock", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const supplier = await storage.getSupplier(parseInt(id));
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Fetch updated stock from supplier's API
      const stockUpdates = await fetchSupplierStock(supplier);
      
      // Update products with new stock levels
      const updateResults = [];
      for (const update of stockUpdates) {
        try {
          const product = await storage.getProduct(update.productId);
          if (product && product.supplierId === parseInt(id)) {
            await storage.updateProduct(update.productId, {
              stockQuantity: update.stockQuantity
            });
            updateResults.push({
              productId: update.productId,
              productName: product.name,
              oldStock: product.stockQuantity,
              newStock: update.stockQuantity,
              success: true
            });
          }
        } catch (error) {
          updateResults.push({
            productId: update.productId,
            success: false,
            error: error.message
          });
        }
      }

      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({
        success: true,
        message: `Updated stock for ${updateResults.filter(r => r.success).length} products`,
        data: updateResults
      });
    } catch (error) {
      console.error("Error syncing stock:", error);
      res.status(500).json({ message: "Failed to sync stock with supplier" });
    }
  });

  // Order forwarding to suppliers
  app.post("/admin/api/suppliers/forward-order", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderId } = req.body;
      
      const order = await storage.getOrder(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Group order items by supplier
      const supplierOrders = new Map();
      
      for (const item of order.items) {
        const product = await storage.getProduct(item.productId);
        if (product && product.supplierId) {
          if (!supplierOrders.has(product.supplierId)) {
            supplierOrders.set(product.supplierId, []);
          }
          supplierOrders.get(product.supplierId).push({
            ...item,
            product: product
          });
        }
      }

      // Forward order to each supplier
      const forwardResults = [];
      for (const [supplierId, items] of supplierOrders) {
        try {
          const supplier = await storage.getSupplier(supplierId);
          if (supplier) {
            const orderData = {
              orderId: order.id,
              orderDate: order.createdAt,
              customerInfo: {
                userId: order.userId,
                totalAmount: order.totalAmount
              },
              shippingAddress: order.shippingAddress,
              billingAddress: order.billingAddress,
              items: items.map(item => ({
                productId: item.productId,
                productName: item.product.name,
                productCode: item.product.productCode,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
              })),
              supplierInstructions: `Please process order #${order.id} for delivery to customer`
            };

            const result = await forwardOrderToSupplier(supplier, orderData);
            forwardResults.push({
              supplierId,
              supplierName: supplier.name,
              itemCount: items.length,
              success: result.success,
              message: result.message,
              data: result.data
            });
          }
        } catch (error) {
          forwardResults.push({
            supplierId,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Order forwarded to ${forwardResults.length} suppliers`,
        data: forwardResults
      });
    } catch (error) {
      console.error("Error forwarding order:", error);
      res.status(500).json({ message: "Failed to forward order to suppliers" });
    }
  });

  app.get("/admin/api/suppliers/:id/delivery-status/:orderId", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { id, orderId } = req.params;
      
      const supplier = await storage.getSupplier(parseInt(id));
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Simulate fetching delivery status from supplier's API
      const deliveryStatus = await fetchSupplierDeliveryStatus(supplier, orderId);
      
      res.json({
        success: true,
        data: deliveryStatus
      });
    } catch (error) {
      console.error("Error fetching delivery status:", error);
      res.status(500).json({ message: "Failed to fetch delivery status" });
    }
  });

  app.post("/admin/api/suppliers/bulk-sync", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { orderIds, action } = req.body; // action: 'fetch_status', 'update_delivery', 'notify_suppliers'
      
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }

      const results = [];
      
      for (const orderId of orderIds) {
        try {
          const order = await storage.getOrder(parseInt(orderId));
          if (!order) {
            results.push({ orderId, success: false, message: "Order not found" });
            continue;
          }

          // Get suppliers for products in this order
          const supplierIds = new Set();
          for (const item of order.items) {
            const product = await storage.getProduct(item.productId);
            if (product && product.supplierId) {
              supplierIds.add(product.supplierId);
            }
          }

          // Sync with each supplier
          for (const supplierId of supplierIds) {
            const supplier = await storage.getSupplier(supplierId);
            if (supplier) {
              const syncResult = await performSupplierSync(supplier, order, action);
              results.push({
                orderId,
                supplierId,
                supplierName: supplier.name,
                success: syncResult.success,
                message: syncResult.message,
                data: syncResult.data
              });
            }
          }
        } catch (error) {
          results.push({ orderId, success: false, message: error.message });
        }
      }

      res.json({
        success: true,
        message: `Bulk sync completed for ${orderIds.length} orders`,
        results
      });
    } catch (error) {
      console.error("Error in bulk supplier sync:", error);
      res.status(500).json({ message: "Failed to perform bulk sync" });
    }
  });

  // AWB Generation route for admin interface
  app.post("/admin/api/orders/:id/generate-awb", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
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
        return res.status(500).json({ message: "No pickup points configured in Sameday account" });
      }

      if (services.length === 0) {
        return res.status(500).json({ message: "No services available in Sameday account" });
      }

      // Use first available pickup point and service
      const pickupPoint = pickupPoints[0];
      const service = services[0];

      // Check if order has items
      if (!order.items || order.items.length === 0) {
        return res.status(400).json({ message: "Order has no items" });
      }

      // Calculate parcels based on products and quantities
      const parcels = [];
      let parcelIndex = 1;

      for (const item of order.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;

        const itemsToShip = item.quantity;
        const piecesPerPackage = product.piecesPerPackage || 1;
        const totalParcels = Math.ceil(itemsToShip / piecesPerPackage);

        for (let p = 0; p < totalParcels; p++) {
          const itemsInThisParcel = Math.min(piecesPerPackage, itemsToShip - (p * piecesPerPackage));
          const weightRatio = itemsInThisParcel / piecesPerPackage;
          
          parcels.push({
            weight: Math.max(1, Math.round((product.weight || 1) * weightRatio)),
            length: product.length || 20,
            width: product.width || 15,
            height: product.height || 5,
            awbParcelNumber: `KTO${String(orderId).padStart(5, '0')}-P${parcelIndex}`
          });
          
          parcelIndex++;
        }
      }

      // Fallback single parcel if calculation fails
      if (parcels.length === 0) {
        parcels.push({
          weight: 1,
          length: 20,
          width: 15,
          height: 5,
          awbParcelNumber: `KTO${String(orderId).padStart(5, '0')}-P1`
        });
      }

      // Get shipping address from order
      const shippingAddr = order.shippingAddress ? JSON.parse(order.shippingAddress) : {};
      
      // Get real counties and cities from Sameday API for proper ID mapping
      const [counties, cities] = await Promise.all([
        samedayAPI.getCounties(),
        samedayAPI.getCities()
      ]);

      // Find county and city IDs based on shipping address
      const targetCounty = (shippingAddr.county || shippingAddr.state || 'Cluj').toLowerCase();
      const targetCity = (shippingAddr.city || 'Cluj-Napoca').toLowerCase();
      
      const county = counties.find(c => 
        c.name.toLowerCase().includes(targetCounty) || targetCounty.includes(c.name.toLowerCase())
      ) || counties[0];
      
      const city = cities.find(c => 
        c.name.toLowerCase().includes(targetCity) || targetCity.includes(c.name.toLowerCase())
      ) || cities[0];

      // Create AWB request
      const awbRequest = {
        pickupPointId: pickupPoint.id,
        serviceId: service.id,
        packageType: "PARCEL",
        awbPayment: "SENDER",
        recipient: {
          name: shippingAddr.name || `${order.firstName} ${order.lastName}`,
          phoneNumber: shippingAddr.phone || order.phone || "+40700000000",
          personType: "individual",
          address: shippingAddr.address || shippingAddr.street || "Address not provided",
          countyId: county?.id,
          cityId: city?.id,
          postalCode: shippingAddr.postalCode || shippingAddr.zip || "400000"
        },
        parcels,
        reference: `Order-${orderId}`,
        observation: `KitchenOff Order #${orderId}`
      };

      console.log('🚚 Generating AWB for order:', orderId);
      console.log('📦 Parcels:', parcels.length, 'parcels');

      // Generate AWB
      const awbResponse = await samedayAPI.createAWB(awbRequest);

      // Update order with AWB information
      const updatedOrder = await storage.updateOrder(orderId, {
        awbNumber: awbResponse.awbNumber,
        awbCourier: 'Sameday',
        awbCost: awbResponse.cost,
        awbCurrency: awbResponse.currency,
        awbPdfUrl: awbResponse.pdfLink,
        status: 'shipped',
        awbCreatedAt: new Date(),
      });

      console.log('✅ AWB generated successfully:', awbResponse.awbNumber);

      res.json({
        success: true,
        awbNumber: awbResponse.awbNumber,
        awbCost: awbResponse.cost,
        currency: awbResponse.currency,
        courier: 'Sameday',
        order: updatedOrder,
        trackingUrl: `https://sameday.ro/track/${awbResponse.awbNumber}`,
      });

    } catch (error) {
      console.error("Admin AWB generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate AWB", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Category Management Routes
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
      const { name, description, imageUrl, showOnMainTop, showOnMainShop, sortOrder } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const categoryData = {
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        showOnMainTop: showOnMainTop || false,
        showOnMainShop: showOnMainShop || false,
        sortOrder: sortOrder || 0,
      };

      const category = await storage.createCategory(categoryData);
      
      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/admin/api/categories/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { name, description, imageUrl, showOnMainTop, showOnMainShop, sortOrder } = req.body;
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const updateData: any = {};
      
      if (name !== undefined) {
        updateData.name = name;
        // Update slug if name changed
        updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (showOnMainTop !== undefined) updateData.showOnMainTop = showOnMainTop;
      if (showOnMainShop !== undefined) updateData.showOnMainShop = showOnMainShop;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const category = await storage.updateCategory(categoryId, updateData);
      
      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/admin/api/categories/:id", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Check if category has products
      const products = await storage.getProducts({ categoryId });
      if (products.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category. It contains ${products.length} product(s). Please move or delete the products first.` 
        });
      }

      await storage.deleteCategory(categoryId);
      
      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Bulk update category homepage positioning
  app.put("/admin/api/categories/bulk/homepage", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { mainTopCategories, mainShopCategories } = req.body;
      
      // Validate input
      if (!Array.isArray(mainTopCategories) || !Array.isArray(mainShopCategories)) {
        return res.status(400).json({ message: "Invalid category arrays" });
      }
      
      if (mainTopCategories.length > 4) {
        return res.status(400).json({ message: "Maximum 4 categories allowed for main top section" });
      }
      
      if (mainShopCategories.length > 3) {
        return res.status(400).json({ message: "Maximum 3 categories allowed for main shop section" });
      }

      // Reset all categories
      const allCategories = await storage.getCategories();
      const resetPromises = allCategories.map(category => 
        storage.updateCategory(category.id, { 
          showOnMainTop: false, 
          showOnMainShop: false,
          sortOrder: 0 
        })
      );
      await Promise.all(resetPromises);

      // Update main top categories
      const mainTopPromises = mainTopCategories.map((categoryId, index) => 
        storage.updateCategory(parseInt(categoryId), { 
          showOnMainTop: true, 
          sortOrder: index + 1 
        })
      );
      await Promise.all(mainTopPromises);

      // Update main shop categories
      const mainShopPromises = mainShopCategories.map((categoryId, index) => 
        storage.updateCategory(parseInt(categoryId), { 
          showOnMainShop: true,
          sortOrder: index + 1 
        })
      );
      await Promise.all(mainShopPromises);

      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({ 
        message: "Homepage categories updated successfully",
        mainTopCount: mainTopCategories.length,
        mainShopCount: mainShopCategories.length
      });
    } catch (error) {
      console.error("Error updating homepage categories:", error);
      res.status(500).json({ message: "Failed to update homepage categories" });
    }
  });

  // Company Settings Routes (also accessible for invoice display)
  app.get("/admin/api/company-settings", async (req: Request, res: Response) => {
    console.log('Company settings API endpoint called');
    try {
      const result = await pool.query(`
        SELECT 
          name, email, logistics_email as "logisticsEmail", phone, address, city, state, zip_code as "zipCode", 
          country, contact_person as "contactPerson", website, 
          vat_number as "vatNumber", registration_number as "registrationNumber", 
          bank_name as "bankName", iban, description,
          default_currency as "defaultCurrency", default_vat_percentage as "defaultVatPercentage", reverse_charge_vat as "reverseChargeVat",
          free_shipping_threshold as "freeShippingThreshold", standard_shipping_cost as "standardShippingCost"
        FROM company_settings 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      console.log('Company settings query result:', result.rows[0]);
      
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        // Return default company settings if none exist
        res.json({
          name: 'Namarte CCL SRL',
          email: 'info@kitchen-off.com',
          logisticsEmail: 'logistics@kitchen-off.com',
          phone: '+40 123 456 789',
          address: 'Calea Mosilor 158',
          city: 'Bucharest',
          state: 'Bucuresti',
          zipCode: '020883',
          country: 'Romania',
          contactPerson: 'Company Administrator',
          website: 'https://kitchen-off.com',
          vatNumber: 'RO12345678',
          registrationNumber: 'J40/12345/2020',
          bankName: 'Banca Comercială Română',
          iban: 'RO49 AAAA 1B31 0075 9384 0000',
          description: 'Professional kitchen equipment and supplies for the HORECA industry.',
          defaultCurrency: 'RON',
          defaultVatPercentage: '19.00',
          reverseChargeVat: '0.00'
        });
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.put("/admin/api/company-settings", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { 
        name, email, logisticsEmail, phone, address, city, state, zipCode, country, 
        contactPerson, website, vatNumber, registrationNumber, bankName, iban, description,
        defaultCurrency, defaultVatPercentage, reverseChargeVat, freeShippingThreshold, standardShippingCost
      } = req.body;
      
      console.log('Updating company settings with currency:', defaultCurrency, 'VAT:', defaultVatPercentage);

      if (!name || !email) {
        return res.status(400).json({ message: "Company name and email are required" });
      }

      // Check if company settings exist
      const existingResult = await pool.query('SELECT id FROM company_settings LIMIT 1');
      
      if (existingResult.rows.length > 0) {
        // Update existing settings
        await pool.query(`
          UPDATE company_settings 
          SET name = $1, email = $2, logistics_email = $3, phone = $4, address = $5, city = $6, 
              state = $7, zip_code = $8, country = $9, contact_person = $10, 
              website = $11, vat_number = $12, registration_number = $13, 
              bank_name = $14, iban = $15, description = $16,
              default_currency = $17, default_vat_percentage = $18, reverse_charge_vat = $19,
              free_shipping_threshold = $20, standard_shipping_cost = $21,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $22
        `, [
          name, email, logisticsEmail, phone, address, city, state, zipCode, country,
          contactPerson, website, vatNumber, registrationNumber, bankName, iban, description,
          defaultCurrency, defaultVatPercentage, reverseChargeVat, freeShippingThreshold, standardShippingCost,
          existingResult.rows[0].id
        ]);
      } else {
        // Insert new settings
        await pool.query(`
          INSERT INTO company_settings (
            name, email, logistics_email, phone, address, city, state, zip_code, country, 
            contact_person, website, vat_number, registration_number, bank_name, iban, description,
            default_currency, default_vat_percentage, reverse_charge_vat, free_shipping_threshold, standard_shipping_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `, [
          name, email, logisticsEmail, phone, address, city, state, zipCode, country,
          contactPerson, website, vatNumber, registrationNumber, bankName, iban, description,
          defaultCurrency, defaultVatPercentage, reverseChargeVat, freeShippingThreshold, standardShippingCost
        ]);
      }

      // After updating company settings, ensure company exists as a supplier
      await ensureCompanySupplier(name, email, phone, address, city, state, zipCode, country, contactPerson);

      res.json({ message: "Company settings updated successfully" });
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // Helper function to ensure company exists as a supplier
  async function ensureCompanySupplier(name: string, email: string, phone: string, address: string, city: string, state: string, zipCode: string, country: string, contactPerson: string) {
    try {
      // Check if company supplier already exists
      const existingSupplier = await pool.query('SELECT id FROM suppliers WHERE name = $1 AND email = $2', [name, email]);
      
      if (existingSupplier.rows.length === 0) {
        // Create company as supplier
        await pool.query(`
          INSERT INTO suppliers (
            name, email, phone, address, city, state, zip_code, country, 
            contact_person, integration_type, notes, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          name, email, phone, address, city, state, zipCode, country,
          contactPerson, 'internal', 'Company warehouse - direct fulfillment', true
        ]);
        console.log(`✅ Created company supplier: ${name}`);
      } else {
        // Update existing company supplier
        await pool.query(`
          UPDATE suppliers 
          SET phone = $3, address = $4, city = $5, state = $6, zip_code = $7, 
              country = $8, contact_person = $9, updated_at = CURRENT_TIMESTAMP
          WHERE name = $1 AND email = $2
        `, [name, email, phone, address, city, state, zipCode, country, contactPerson]);
        console.log(`✅ Updated company supplier: ${name}`);
      }
    } catch (error) {
      console.error('Error ensuring company supplier:', error);
    }
  }

  // Configure multer for Excel file uploads
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.toLowerCase().endsWith('.xlsx') ||
          file.originalname.toLowerCase().endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Excel product import endpoint
  app.post("/admin/api/products/import-excel", authenticateAdmin, excelUpload.single('excelFile'), async (req: AdminAuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No Excel file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, any>>;

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or invalid" });
      }

      console.log(`📤 Processing ${jsonData.length} rows from Excel file`);
      console.log('First row data:', JSON.stringify(jsonData[0], null, 2));

      let imported = 0;
      let errors = [];
      let duplicates = [];

      // Get all categories for validation
      const categories = await storage.getCategories();
      const categoryMap = new Map();
      categories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        categoryMap.set(cat.name, cat);
      });

      // Get existing products to check for duplicates
      const existingProducts = await storage.getProducts();
      const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2; // Excel row number (header is row 1)

        try {
          console.log(`Processing row ${rowNumber}:`, JSON.stringify(row, null, 2));
          
          // Extract and validate required fields
          const productName = row['Product Name']?.toString()?.trim();
          const price = parseFloat(row['Price']?.toString()?.replace(',', '.') || '0');
          const stockQuantity = parseInt(row['Stock Quantity']?.toString() || '0');
          const categoryId = parseInt(row['Category ID']?.toString() || '0');
          
          console.log(`Row ${rowNumber} parsed:`, { productName, price, stockQuantity, categoryId });

          // Validation
          if (!productName) {
            errors.push(`Row ${rowNumber}: Product Name is required`);
            continue;
          }

          if (existingNames.has(productName.toLowerCase())) {
            duplicates.push(`Row ${rowNumber}: Product "${productName}" already exists`);
            continue;
          }

          if (price <= 0) {
            errors.push(`Row ${rowNumber}: Price must be greater than 0`);
            continue;
          }

          if (stockQuantity < 0) {
            errors.push(`Row ${rowNumber}: Stock Quantity cannot be negative`);
            continue;
          }

          // Try to find category by ID first, then by name if provided
          let finalCategoryId = categoryId;
          const categoryName = row['Category Name']?.toString()?.trim();
          
          if (!categoryMap.has(categoryId)) {
            // If category ID doesn't exist, try to find by name
            if (categoryName) {
              const categoryByName = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
              if (categoryByName) {
                finalCategoryId = categoryByName.id;
                console.log(`✅ Found category by name: "${categoryName}" (ID: ${finalCategoryId})`);
              } else {
                errors.push(`Row ${rowNumber}: Category ID ${categoryId} and Category Name "${categoryName}" do not exist`);
                continue;
              }
            } else {
              errors.push(`Row ${rowNumber}: Category ID ${categoryId} does not exist`);
              continue;
            }
          }

          // Get company defaults for currency and VAT
          const companySettings = await storage.getCompanySettings();
          const defaultCurrency = companySettings?.defaultCurrency || 'RON';
          const defaultVatPercentage = companySettings?.defaultVatPercentage || 19;

          // Extract optional fields with defaults
          const description = row['Description']?.toString()?.trim() || '';
          const status = row['Status']?.toString()?.toLowerCase()?.trim() || 'active';
          const vatValue = parseFloat(row['VAT %']?.toString()?.replace('%', '').replace(',', '.') || defaultVatPercentage.toString());
          const currency = row['Currency']?.toString()?.trim()?.toUpperCase() || defaultCurrency;
          const productCode = row['Product Code']?.toString()?.trim() || '';
          const ncCode = row['NC Code']?.toString()?.trim() || '';
          const cpvCode = row['CPV Code']?.toString()?.trim() || '';
          const supplierName = row['Supplier Name']?.toString()?.trim() || 'KitchenOff Direct';
          
          // Extract logistics fields with defaults and validation
          const weight = Math.max(1, Math.round(parseFloat(row['Weight (kg)']?.toString()?.replace(',', '.') || '1')));
          const length = parseFloat(row['Length (cm)']?.toString()?.replace(',', '.') || '10');
          const width = parseFloat(row['Width (cm)']?.toString()?.replace(',', '.') || '10'); 
          const height = parseFloat(row['Height (cm)']?.toString()?.replace(',', '.') || '10');
          const piecesPerPackage = Math.max(1, parseInt(row['Pieces Per Package']?.toString() || '1'));

          // Validate status
          const validStatuses = ['active', 'inactive', 'draft', 'discontinued'];
          if (!validStatuses.includes(status)) {
            errors.push(`Row ${rowNumber}: Status must be one of: ${validStatuses.join(', ')}`);
            continue;
          }

          // Find or create supplier
          let supplierId = null;
          const suppliers = await storage.getSuppliers();
          const supplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
          if (supplier) {
            supplierId = supplier.id;
            console.log(`✅ Found existing supplier: ${supplierName} (ID: ${supplierId})`);
          } else {
            console.log(`🔄 Creating new supplier: ${supplierName}`);
            // Create new supplier if it doesn't exist
            const newSupplier = await storage.createSupplier({
              name: supplierName,
              email: `contact@${supplierName.toLowerCase().replace(/\s+/g, '')}.com`,
              phone: '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              country: '',
              contactPerson: '',
              integrationType: 'email',
              isActive: true
            });
            supplierId = newSupplier.id;
            console.log(`✅ Created new supplier: ${supplierName} (ID: ${supplierId})`);
          }

          // Generate slug
          const slug = productName.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

          // Create product
          const productData = {
            name: productName,
            slug: slug,
            description: description,
            price: price.toString(),
            compareAtPrice: (price * 1.2).toString(), // 20% higher than regular price
            categoryId: finalCategoryId,
            supplierId: supplierId,
            stockQuantity: stockQuantity,
            featured: false,
            images: [],
            vatValue: vatValue.toString(),
            vatPercentage: vatValue.toString(), // Use same value for backwards compatibility
            currency: currency, // Use company default currency (RON for Romanian market)
            productCode: productCode,
            ncCode: ncCode,
            cpvCode: cpvCode,
            status: status,
            weight: weight,
            length: length,
            width: width,
            height: height,
            piecesPerPackage: piecesPerPackage
          };

          console.log(`🔄 Creating product with data:`, JSON.stringify(productData, null, 2));
          const createdProduct = await storage.createProduct(productData);
          console.log(`✅ Product created successfully:`, createdProduct);
          imported++;
          existingNames.add(productName.toLowerCase()); // Add to set to prevent duplicates in same import

          console.log(`✅ Imported product: ${productName}`);
        } catch (error: any) {
          console.error(`❌ Error processing row ${rowNumber}:`, error);
          console.error('Error details:', error.stack);
          errors.push(`Row ${rowNumber}: ${error.message}`);
        }
      }

      // Refresh memory cache
      await loadAllDataIntoMemory();

      console.log('📊 Import Summary:', {
        total: jsonData.length,
        imported: imported,
        errors: errors.length,
        duplicates: duplicates.length,
        errorDetails: errors,
        duplicateDetails: duplicates
      });

      res.json({
        success: true,
        message: `Import completed: ${imported} products imported`,
        total: jsonData.length,
        imported: imported,
        errors: errors,
        duplicates: duplicates
      });

    } catch (error: any) {
      console.error("Excel import error:", error);
      res.status(500).json({ 
        message: "Failed to import Excel file", 
        error: error.message 
      });
    }
  });

  // Smartbill Integration Routes
  app.get("/admin/api/smartbill/test", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();
      
      const isConnected = await invoiceService.testConnection();
      
      res.json({
        success: isConnected,
        message: isConnected ? "Smartbill connection successful" : "Smartbill connection failed",
        enabled: process.env.ENABLE_SMARTBILL === 'true',
        series: process.env.SMARTBILL_SERIES || 'FACT'
      });
    } catch (error) {
      console.error("Smartbill test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test Smartbill connection",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/admin/api/smartbill/sync-products", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { SmartbillAPI } = await import('./smartbill-api.js');
      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();
      
      if (process.env.ENABLE_SMARTBILL !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: "Smartbill integration is not enabled" 
        });
      }

      // Get all products from local database
      const products = await storage.getProducts();
      
      // Initialize Smartbill API
      const smartbillConfig = {
        username: process.env.SMARTBILL_USERNAME || '',
        token: process.env.SMARTBILL_TOKEN || '',
        companyVat: process.env.SMARTBILL_COMPANY_VAT || ''
      };
      
      const smartbillApi = new SmartbillAPI(smartbillConfig);
      
      // Sync products to Smartbill
      const syncResults = await smartbillApi.syncProductsToSmartbill(
        smartbillConfig.companyVat,
        products
      );
      
      res.json({
        success: true,
        message: `Product sync completed: ${syncResults.success} successful, ${syncResults.failed} failed`,
        data: syncResults
      });
      
    } catch (error) {
      console.error("Product sync error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to sync products to Smartbill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/admin/api/smartbill/sync-stock", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { SmartbillAPI } = await import('./smartbill-api.js');
      
      if (process.env.ENABLE_SMARTBILL !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: "Smartbill integration is not enabled" 
        });
      }

      // Get all products to create product code mapping
      const products = await storage.getProducts();
      const productMappings = new Map<string, number>();
      
      for (const product of products) {
        const productCode = product.productCode || product.id.toString();
        productMappings.set(productCode, product.id);
      }
      
      // Initialize Smartbill API
      const smartbillConfig = {
        username: process.env.SMARTBILL_USERNAME || '',
        token: process.env.SMARTBILL_TOKEN || '',
        companyVat: process.env.SMARTBILL_COMPANY_VAT || ''
      };
      
      const smartbillApi = new SmartbillAPI(smartbillConfig);
      
      // Sync stock from Smartbill
      const syncResults = await smartbillApi.syncStockFromSmartbill(
        smartbillConfig.companyVat,
        productMappings
      );
      
      // Update local database with stock changes
      for (const stockUpdate of syncResults.stockUpdates) {
        try {
          await storage.updateProductStock(stockUpdate.productId, stockUpdate.newStock);
          console.log(`Updated local stock for product ${stockUpdate.productId}: ${stockUpdate.newStock}`);
        } catch (error) {
          console.error(`Failed to update local stock for product ${stockUpdate.productId}:`, error);
        }
      }
      
      // Refresh memory cache
      await loadAllDataIntoMemory();
      
      res.json({
        success: true,
        message: `Stock sync completed: ${syncResults.success} successful, ${syncResults.failed} failed`,
        data: syncResults
      });
      
    } catch (error) {
      console.error("Stock sync error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to sync stock from Smartbill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/admin/api/smartbill/create-invoice/:orderId", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid order ID" 
        });
      }

      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();
      
      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          message: "Order not found" 
        });
      }

      // Create invoice via Smartbill
      const invoice = await invoiceService.generateInvoiceAfterPayment(orderId, {
        status: 'completed',
        paymentMethod: 'manual_admin'
      });
      
      res.json({
        success: true,
        message: "Invoice created successfully via Smartbill",
        data: invoice
      });
      
    } catch (error) {
      console.error("Manual invoice creation error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create invoice via Smartbill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/admin/api/smartbill/invoice/:invoiceId/pdf", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid invoice ID" 
        });
      }

      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();
      
      // Get PDF from Smartbill
      const pdfBuffer = await invoiceService.getInvoicePdf(invoiceId);
      
      if (!pdfBuffer) {
        return res.status(404).json({ 
          success: false, 
          message: "Invoice PDF not available" 
        });
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("PDF download error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to download invoice PDF",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/admin/api/smartbill/invoice/:invoiceId/send-email", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const { email } = req.body;
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid invoice ID" 
        });
      }

      const { createInvoiceService } = await import('./invoice-service.js');
      const invoiceService = await createInvoiceService();
      
      // Send invoice via email through Smartbill
      const sent = await invoiceService.sendInvoiceByEmail(invoiceId, email);
      
      res.json({
        success: sent,
        message: sent ? "Invoice sent successfully" : "Failed to send invoice"
      });
      
    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send invoice via email",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/admin/api/smartbill/products", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { SmartbillAPI } = await import('./smartbill-api.js');
      
      if (process.env.ENABLE_SMARTBILL !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: "Smartbill integration is not enabled" 
        });
      }

      const smartbillConfig = {
        username: process.env.SMARTBILL_USERNAME || '',
        token: process.env.SMARTBILL_TOKEN || '',
        companyVat: process.env.SMARTBILL_COMPANY_VAT || ''
      };
      
      const smartbillApi = new SmartbillAPI(smartbillConfig);
      const products = await smartbillApi.getProducts(smartbillConfig.companyVat);
      
      res.json({
        success: true,
        data: products
      });
      
    } catch (error) {
      console.error("Get Smartbill products error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get products from Smartbill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/admin/api/smartbill/stock", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const { SmartbillAPI } = await import('./smartbill-api.js');
      const { productCode } = req.query;
      
      if (process.env.ENABLE_SMARTBILL !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: "Smartbill integration is not enabled" 
        });
      }

      const smartbillConfig = {
        username: process.env.SMARTBILL_USERNAME || '',
        token: process.env.SMARTBILL_TOKEN || '',
        companyVat: process.env.SMARTBILL_COMPANY_VAT || ''
      };
      
      const smartbillApi = new SmartbillAPI(smartbillConfig);
      const stock = await smartbillApi.getProductStock(
        smartbillConfig.companyVat,
        productCode as string
      );
      
      res.json({
        success: true,
        data: stock
      });
      
    } catch (error) {
      console.error("Get Smartbill stock error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get stock from Smartbill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Company/Shipping Settings Routes
  app.get("/admin/api/settings", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.put("/admin/api/settings", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const settings = req.body;
      const updatedSettings = await storage.updateCompanySettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // Shipping/Parcel Company Settings Routes
  app.get("/admin/api/shipping-settings", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const settings = await storage.getShippingSettings();
      res.json(settings || {
        companyName: 'Sameday Courier',
        pickupPointCode: '447249',
        username: '',
        password: '',
        apiBaseUrl: 'https://api.sameday.ro',
        isActive: true,
        serviceId: 7,
        defaultPackageType: 'PARCEL',
        defaultPaymentMethod: 'SENDER'
      });
    } catch (error) {
      console.error("Error fetching shipping settings:", error);
      res.status(500).json({ message: "Failed to fetch shipping settings" });
    }
  });

  app.put("/admin/api/shipping-settings", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const settings = req.body;
      const updatedSettings = await storage.updateShippingSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating shipping settings:", error);
      res.status(500).json({ message: "Failed to update shipping settings" });
    }
  });
}