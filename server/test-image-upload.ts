import { uploadImageToR2, isR2Configured } from "./r2-storage";
import { promises as fs } from "fs";

async function testImageUpload() {
  console.log("🧪 Testing Image Upload to R2...\n");

  console.log("☁️ R2 Configured:", isR2Configured());

  // Read a test image from local uploads
  const testImagePath = "/home/runner/workspace/uploads/products/processed-product-1752692757057-943.jpeg";
  
  try {
    const imageBuffer = await fs.readFile(testImagePath);
    console.log(`📁 Read test image: ${testImagePath} (${imageBuffer.length} bytes)`);

    console.log("\n📤 Uploading to R2...");
    const result = await uploadImageToR2(imageBuffer, "test-image.jpeg", "products");

    if (result) {
      console.log("\n✅ Upload successful!");
      console.log("  📍 Filename:", result.filename);
      console.log("  🌐 URL:", result.url);
      console.log("  🖼️ Thumbnail URL:", result.thumbnailUrl);
      console.log("  📏 Size:", result.size, "bytes");
      
      // Verify the file is accessible
      console.log("\n🔍 Verifying public access...");
      const response = await fetch(result.url);
      console.log("  Status:", response.status, response.statusText);
      console.log("  Content-Type:", response.headers.get("content-type"));
      console.log("  Content-Length:", response.headers.get("content-length"));
      
      if (response.ok) {
        console.log("\n✅ Image is publicly accessible!");
      } else {
        console.log("\n❌ Image is NOT publicly accessible!");
      }
    } else {
      console.log("\n❌ Upload returned null - check R2 configuration");
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

testImageUpload();
