/**
 * Compresses and resizes company logo image file to a lightweight, crisp Data URL (max 300x300px).
 * Prevents HTTP payload size errors and Base64 string truncation in MySQL.
 */
export const compressLogoImage = (file, maxWidth = 300, maxHeight = 300) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject('Failed to read file');
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => resolve(event.target.result); // Fallback to raw base64 if canvas fails
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG for clean transparency preservation
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};
