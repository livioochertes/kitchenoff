import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';

// Extend Express Request interface to include processed files
declare global {
  namespace Express {
    interface Request {
      processedFiles?: {
        filename: string;
        thumbnail: string;
        originalName: string;
        size: number;
        url: string;
        thumbnailUrl: string;
      }[];
    }
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Determine upload directory based on request path
    const uploadType = req.path.includes('categories') ? 'categories' : 'products';
    const uploadDir = path.join(process.cwd(), 'uploads', uploadType);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    const fileType = req.path.includes('categories') ? 'category' : 'product';
    const filename = `${fileType}-${timestamp}-${randomNum}${ext}`;
    cb(null, filename);
  }
});

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer with size limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Middleware to process uploaded images
export const processImages = async (req: Request, res: Response, next: NextFunction) => {
  // Handle both single file and multiple files
  let files: Express.Multer.File[] = [];
  
  if (req.files && Array.isArray(req.files)) {
    files = req.files;
  } else if (req.file) {
    files = [req.file];
  } else {
    return next();
  }

  try {
    const processedFiles = [];
    
    for (const file of files) {
      const inputPath = file.path;
      const outputPath = path.join(
        path.dirname(inputPath),
        `processed-${file.filename}`
      );

      // Process image: resize, optimize, and convert to WebP
      await sharp(inputPath)
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      // Create thumbnail
      const thumbnailPath = path.join(
        path.dirname(inputPath),
        `thumb-${file.filename.replace(/\.[^/.]+$/, '')}.webp`
      );
      
      await sharp(inputPath)
        .resize(200, 150, { 
          fit: 'cover',
          position: 'center' 
        })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);

      // Remove original file
      await fs.unlink(inputPath);

      processedFiles.push({
        filename: `processed-${file.filename}`,
        thumbnail: `thumb-${file.filename.replace(/\.[^/.]+$/, '')}.webp`,
        originalName: file.originalname,
        size: file.size,
        url: `/uploads/products/processed-${file.filename}`,
        thumbnailUrl: `/uploads/products/thumb-${file.filename.replace(/\.[^/.]+$/, '')}.webp`
      });
    }

    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ success: false, message: 'Error processing images' });
  }
};

// Serve uploaded files
export const serveUploads = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'File not found' });
    }
  });
};

// Delete uploaded file
export const deleteUploadedFile = async (filename: string): Promise<boolean> => {
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};