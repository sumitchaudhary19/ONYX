import imageCompression from 'browser-image-compression';

/**
 * Validates and compresses media files before upload.
 * Image: compresses to max 500KB, max 1920x1920
 * Video: validates max 10MB limit
 * Audio: validates max 5MB limit
 * 
 * @param {File} file 
 * @param {Function} onError Callback for showing Toast/alert
 * @returns {Promise<File|null>} The compressed/validated file, or null if rejected.
 */
export async function processMediaFile(file, onError = alert) {
  if (!file) return null;

  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isImage = file.type.startsWith('image/');

  if (isVideo) {
    if (file.size > 10 * 1024 * 1024) {
      onError("File too large. Please select a video under 10MB.");
      return null;
    }
    return file;
  }

  if (isAudio) {
    if (file.size > 5 * 1024 * 1024) {
      onError("File too large. Audio must be under 5MB.");
      return null;
    }
    return file;
  }

  if (isImage) {
    // If it's already tiny, or not a compressible type (like gif/svg), skip compression
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return file;
    }

    try {
      const options = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type // Try to preserve original type
      };
      
      const compressedBlob = await imageCompression(file, options);
      // Convert Blob back to File
      return new File([compressedBlob], file.name, {
        type: compressedBlob.type,
        lastModified: Date.now()
      });
    } catch (err) {
      console.error("Image compression error:", err);
      // Fallback to original if compression fails, but still check an absolute upper bound just in case
      if (file.size > 10 * 1024 * 1024) {
         onError("Image is too large and could not be compressed.");
         return null;
      }
      return file;
    }
  }

  return file;
}
