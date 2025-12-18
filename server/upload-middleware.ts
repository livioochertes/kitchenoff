import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import { isR2Configured, uploadImageToR2 } from './r2-storage';

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

// Use memory storage when R2 is available, disk storage as fallback
const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadType = req.path.includes('categories') ? 'categories' : 'products';
    const uploadDir = path.join(process.cwd(), 'uploads', uploadType);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
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

// Use memory storage for R2, disk storage for local
const getStorage = () => {
  if (isR2Configured()) {
    console.log("📦 Using R2 cloud storage for uploads");
    return memoryStorage;
  }
  console.log("📁 Using local disk storage for uploads");
  return diskStorage;
};

// Configure multer with dynamic storage
export const upload = multer({
  storage: memoryStorage, // Always use memory, we'll decide where to save in processImages
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Middleware to process uploaded images
export const processImages = async (req: Request, res: Response, next: NextFunction) => {
  console.log("processImages middleware called");
  
  // Handle both single file and multiple files
  let files: Express.Multer.File[] = [];
  
  if (req.files && Array.isArray(req.files)) {
    files = req.files;
    console.log("Using req.files array with", files.length, "files");
  } else if (req.file) {
    files = [req.file];
    console.log("Using req.file single file");
  } else {
    console.log("No files found, calling next()");
    return next();
  }

  const uploadType = req.path.includes('categories') ? 'categories' : 'products';

  try {
    const processedFiles = [];

    // Check if R2 is configured
    if (isR2Configured()) {
      console.log("☁️ Uploading to Cloudflare R2...");
      
      for (const file of files) {
        const result = await uploadImageToR2(file.buffer, file.originalname, uploadType);
        if (result) {
          processedFiles.push({
            filename: result.filename,
            thumbnail: path.basename(result.thumbnailUrl),
            originalName: result.originalName,
            size: result.size,
            url: result.url,
            thumbnailUrl: result.thumbnailUrl
          });
        }
      }
    } else {
      console.log("📁 Saving to local filesystem...");
      
      // Fall back to local storage
      for (const file of files) {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        const ext = path.extname(file.originalname);
        const fileType = uploadType === 'categories' ? 'category' : 'product';
        const baseFilename = `${fileType}-${timestamp}-${randomNum}`;
        
        const uploadDir = path.join(process.cwd(), 'uploads', uploadType);
        await fs.mkdir(uploadDir, { recursive: true });
        
        const outputPath = path.join(uploadDir, `processed-${baseFilename}${ext}`);
        const thumbnailPath = path.join(uploadDir, `thumb-${baseFilename}.webp`);
        
        // Process main image
        await sharp(file.buffer)
          .resize(800, 600, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toFile(outputPath);

        // Create thumbnail
        await sharp(file.buffer)
          .resize(200, 150, { 
            fit: 'cover',
            position: 'center' 
          })
          .webp({ quality: 70 })
          .toFile(thumbnailPath);

        processedFiles.push({
          filename: `processed-${baseFilename}${ext}`,
          thumbnail: `thumb-${baseFilename}.webp`,
          originalName: file.originalname,
          size: file.size,
          url: `/uploads/${uploadType}/processed-${baseFilename}${ext}`,
          thumbnailUrl: `/uploads/${uploadType}/thumb-${baseFilename}.webp`
        });
      }
    }

    req.processedFiles = processedFiles;
    console.log("✅ Processed", processedFiles.length, "files");
    next();
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ success: false, message: 'Error processing images' });
  }
};

// Serve uploaded files (for local storage only)
export const serveUploads = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'File not found' });
    }
  });
};

// Delete uploaded file (works for both local and R2)
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
