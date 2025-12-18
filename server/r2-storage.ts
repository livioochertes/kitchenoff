import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import path from "path";

// R2 Configuration - uses environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_CDN_URL = process.env.R2_CDN_URL; // Your public CDN URL (e.g., https://cdn.kitchen-off.com)

// Check if R2 is configured
export function isR2Configured(): boolean {
  const configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_CDN_URL);
  return configured;
}

// Log R2 status on module load
console.log("☁️ R2 Storage Status:", isR2Configured() ? "CONFIGURED" : "NOT CONFIGURED");
if (isR2Configured()) {
  console.log("  - Account ID:", R2_ACCOUNT_ID?.slice(0, 8) + "...");
  console.log("  - Bucket:", R2_BUCKET_NAME);
  console.log("  - CDN URL:", R2_CDN_URL);
}

// Create S3 client for R2
function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    console.warn("⚠️ R2 storage not configured - falling back to local storage");
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

export interface UploadResult {
  filename: string;
  url: string;
  thumbnailUrl: string;
  originalName: string;
  size: number;
}

export async function uploadImageToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  uploadType: "products" | "categories"
): Promise<UploadResult | null> {
  const client = getR2Client();
  
  if (!client) {
    return null; // R2 not configured
  }

  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  const ext = path.extname(originalFilename);
  const baseFilename = `${uploadType === 'categories' ? 'category' : 'product'}-${timestamp}-${randomNum}`;
  
  // Process main image
  const processedBuffer = await sharp(fileBuffer)
    .resize(800, 600, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Create thumbnail
  const thumbnailBuffer = await sharp(fileBuffer)
    .resize(200, 150, { 
      fit: 'cover',
      position: 'center' 
    })
    .webp({ quality: 70 })
    .toBuffer();

  const mainKey = `${uploadType}/processed-${baseFilename}.jpeg`;
  const thumbKey = `${uploadType}/thumb-${baseFilename}.webp`;

  try {
    // Upload main image
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: mainKey,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
    }));

    // Upload thumbnail
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: thumbKey,
      Body: thumbnailBuffer,
      ContentType: 'image/webp',
    }));

    const cdnBase = R2_CDN_URL!.replace(/\/$/, ''); // Remove trailing slash if present

    console.log(`✅ Uploaded to R2: ${mainKey}`);

    return {
      filename: `processed-${baseFilename}.jpeg`,
      url: `${cdnBase}/${mainKey}`,
      thumbnailUrl: `${cdnBase}/${thumbKey}`,
      originalName: originalFilename,
      size: processedBuffer.length,
    };
  } catch (error) {
    console.error("❌ R2 upload error:", error);
    throw error;
  }
}

export async function deleteImageFromR2(imageUrl: string): Promise<boolean> {
  const client = getR2Client();
  
  if (!client || !R2_CDN_URL) {
    return false;
  }

  try {
    // Extract key from URL
    const cdnBase = R2_CDN_URL.replace(/\/$/, '');
    const key = imageUrl.replace(`${cdnBase}/`, '');

    await client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
    }));

    // Also try to delete thumbnail
    const thumbKey = key.replace('processed-', 'thumb-').replace('.jpeg', '.webp');
    try {
      await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME!,
        Key: thumbKey,
      }));
    } catch (e) {
      // Thumbnail might not exist
    }

    console.log(`✅ Deleted from R2: ${key}`);
    return true;
  } catch (error) {
    console.error("❌ R2 delete error:", error);
    return false;
  }
}

// Upload multiple images
export async function uploadMultipleImagesToR2(
  files: { buffer: Buffer; originalname: string }[],
  uploadType: "products" | "categories"
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadImageToR2(file.buffer, file.originalname, uploadType);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
