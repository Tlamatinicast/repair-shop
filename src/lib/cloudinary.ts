import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `tlamatech/${folder}`, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
}

export async function deleteImage(url: string): Promise<void> {
  try {
    // Extract public_id from URL: .../tlamatech/folder/filename
    const match = url.match(/tlamatech\/.*\/([^/.]+)/);
    if (!match) return;
    const publicId = url.split('/upload/')[1]?.replace(/\.[^.]+$/, '');
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch { /* ignore delete errors */ }
}
