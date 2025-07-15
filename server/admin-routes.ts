import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

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
}