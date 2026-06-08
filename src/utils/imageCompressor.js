/**
 * Downsamples and compresses an image file on the client device using HTML5 Canvas.
 * Preserves aspect ratio while enforcing a maximum resolution boundary.
 * 
 * @param {File} file - The raw image file from the input component.
 * @param {number} maxDimension - Maximum width or height in pixels (default 1024).
 * @param {number} quality - JPEG compression quality from 0.0 to 1.0 (default 0.7).
 * @returns {Promise<string>} - Resolves to a clean base64 string (without data URI prefix).
 */
export const compressGymImage = (file, maxDimension = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Enforce maximum dimension boundaries proportionally
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output to JPEG format to compress and discard camera metadata
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Strip the metadata prefix ("data:image/jpeg;base64,") for the backend
        const cleanBase64 = compressedDataUrl.split(',')[1];
        resolve(cleanBase64);
      };
      
      img.onerror = (err) => reject(new Error('Failed to load image element into DOM: ' + err.message));
    };
    
    reader.onerror = (err) => reject(new Error('Failed to read image file stream: ' + err.message));
  });
};
