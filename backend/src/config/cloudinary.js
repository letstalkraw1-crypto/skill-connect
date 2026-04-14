const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Apply video compression for challenge videos
    const isVideo = options.resource_type === 'video';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'skill-connect',
        resource_type: 'auto',
        ...(isVideo ? {
          // Compress to 720p, quality auto, reduce bitrate
          transformation: [
            { width: 1280, height: 720, crop: 'limit' },
            { quality: 'auto:good', fetch_format: 'mp4', video_codec: 'h264' },
          ],
          eager: [{ quality: 'auto:good', fetch_format: 'mp4', video_codec: 'h264', width: 1280, height: 720, crop: 'limit' }],
          eager_async: false,
        } : {}),
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
