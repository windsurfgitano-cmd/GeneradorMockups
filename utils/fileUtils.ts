
/**
 * Converts a File object to a base64 encoded string, removing the data URL prefix.
 * @param file The File object to convert.
 * @returns A promise that resolves with the raw base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result includes a prefix like "data:image/jpeg;base64,"
        // The API needs just the raw base64 data.
        const base64String = reader.result.split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Could not extract base64 string from file data."));
        }
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
