/**
 * Converts a File object to a base64 encoded string and extracts its MIME type.
 * @param file The file to convert.
 * @returns A promise that resolves to an object containing the base64 string and the MIME type.
 */
export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // The result looks like "data:image/jpeg;base64,LzlqLzRBQ...".
            // We need to extract the part after the comma for the base64 data,
            // and the part between "data:" and ";base64" for the mimeType.
            const parts = result.split(',');
            if (parts.length !== 2) {
                return reject(new Error("Invalid Data URL format."));
            }
            
            const mimeTypePart = parts[0].match(/:(.*?);/);
            if (!mimeTypePart || mimeTypePart.length < 2) {
                return reject(new Error("Could not extract MIME type from Data URL."));
            }

            const base64 = parts[1];
            const mimeType = mimeTypePart[1];
            
            resolve({ base64, mimeType });
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Creates a text file from a string and triggers a download in the browser.
 * @param content The string content for the text file.
 * @param fileName The desired name for the downloaded file.
 */
export const exportResultsAsTxt = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
