import { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Subdomain detection middleware
export function subdomainMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host');
  const subdomain = extractSubdomain(host);
  
  // Add subdomain info to request
  (req as any).subdomain = subdomain;
  
  next();
}

function extractSubdomain(host: string | undefined): string | null {
  if (!host) return null;
  
  // Handle localhost development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return null;
  }
  
  // Handle Replit domains
  if (host.includes('.replit.dev') || host.includes('.replit.app')) {
    return null;
  }
  
  const parts = host.split('.');
  
  // For kitchen-off.com, admin.kitchen-off.com
  if (parts.length >= 3 && parts[parts.length - 2] === 'kitchen-off') {
    return parts[0];
  }
  
  return null;
}

// Admin subdomain handler
export function adminSubdomainHandler(req: Request, res: Response, next: NextFunction) {
  const subdomain = (req as any).subdomain;
  
  if (subdomain === 'admin') {
    // Serve admin application
    serveAdminApp(req, res, next);
  } else {
    // Continue to main application
    next();
  }
}

function serveAdminApp(req: Request, res: Response, next: NextFunction) {
  // If it's an API request, let it go through to the admin routes
  if (req.path.startsWith('/admin/api/')) {
    return next();
  }
  
  // For asset requests, let them go through normal static handling
  if (req.path.startsWith('/src/') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.svg') || req.path.endsWith('.png')) {
    return next();
  }
  
  // For admin subdomain, serve the admin index.html
  try {
    res.sendFile(path.join(__dirname, '..', 'client', 'admin', 'index.html'));
  } catch (error) {
    // Fallback: serve admin index.html from current directory
    res.sendFile(path.resolve('./client/admin/index.html'));
  }
}