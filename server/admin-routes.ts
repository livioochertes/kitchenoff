import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import path from "path";

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as { adminId: number };
    const admin = await storage.getUser(decoded.adminId);
    
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({ message: "Admin access denied" });
    }

    req.adminId = decoded.adminId;
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
  // Serve admin interface directly at /admin
  app.get("/admin", (req: Request, res: Response) => {
    try {
      const adminPath = path.resolve('./admin/simple.html');
      console.log('Serving admin interface from:', adminPath);
      res.sendFile(adminPath);
    } catch (error) {
      console.error('Error serving admin interface:', error);
      // Fallback to basic HTML
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>KitchenOff Admin</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
            h1 { color: #333; margin-bottom: 20px; text-align: center; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; }
            input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
            .demo-info { margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; font-size: 14px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>KitchenOff Admin</h1>
            <form action="/admin/api/login" method="post">
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="admin@kitchen-off.com" required>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" value="admin123" required>
              </div>
              <button type="submit">Login</button>
            </form>
            <div class="demo-info">
              <p><strong>Demo Credentials:</strong></p>
              <p>Email: admin@kitchen-off.com</p>
              <p>Password: admin123</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  });
  
  // Serve admin interface for any admin/* route except api routes
  app.get("/admin/*", (req: Request, res: Response) => {
    // Skip API routes
    if (req.path.startsWith('/admin/api/')) {
      return;
    }
    
    try {
      const adminPath = path.resolve('./admin/index.html');
      console.log('Serving admin interface from:', adminPath);
      res.sendFile(adminPath);
    } catch (error) {
      console.error('Error serving admin interface:', error);
      res.status(500).send('Admin interface temporarily unavailable');
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

  app.put("/admin/api/orders/:id/status", authenticateAdmin, async (req: AdminAuthRequest, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
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
        stockQuantity: productData.stockQuantity ? parseInt(productData.stockQuantity) : undefined
      });

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
}