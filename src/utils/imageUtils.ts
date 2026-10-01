/**
 * Utility to convert image files from user's computer/device into
 * compressed, optimized base64 data URLs for storage in Firebase Firestore.
 */

export async function fileToCompressedBase64(
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.76
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }

      // If SVG, preserve original vector format
      if (file.type === 'image/svg+xml') {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(result); // Fallback to raw dataURL
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Calculate aspect ratio
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Use jpeg with good quality (~30-50KB) for maximum speed and compatibility
          const isPngWithTransparency = file.type === 'image/png';
          const outputType = isPngWithTransparency ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputType, isPngWithTransparency ? undefined : quality);
          resolve(compressed);
        } catch (e) {
          // Fallback to original if any error occurs
          resolve(result);
        }
      };
      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}
