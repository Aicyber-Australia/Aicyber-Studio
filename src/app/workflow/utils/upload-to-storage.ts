import { studioUploadImage, isStudioUploadError } from '@/app/api/services/supabase/studio-storage';
import { StudioUploadImageRequest } from '@/types/request/studio-upload-image-request';

/**
 * Upload a file to Supabase storage and return the public URL
 * Handles blob URLs by converting them back to files
 *
 * @param file - The File object to upload
 * @returns Promise<string> - The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadFileToStorage(file: File): Promise<string> {
  try {
    console.log('📤 Uploading file to Supabase storage:', file.name, file.type);

    const request: StudioUploadImageRequest = {
      imageData: file,
      contentType: file.type || 'image/png'
    };

    const response = await studioUploadImage(request);

    if (isStudioUploadError(response)) {
      throw new Error(`Upload failed: ${response.error}`);
    }

    console.log('✅ Upload successful:', response.url);
    return response.url;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

/**
 * Upload a blob URL to Supabase storage
 * Converts the blob URL to a File first, then uploads
 *
 * @param blobUrl - The blob:// URL to upload
 * @param fileName - The filename for the uploaded file
 * @returns Promise<string> - The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadBlobUrlToStorage(blobUrl: string, fileName: string): Promise<string> {
  try {
    // Fetch the blob from the blob URL
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    // Determine content type from blob or default to image/png
    const contentType = blob.type || 'image/png';

    // Create a File from the blob
    const file = new File([blob], fileName, { type: contentType });

    // Upload using the main upload function
    return await uploadFileToStorage(file);
  } catch (error) {
    console.error('❌ Blob URL upload error:', error);
    throw error;
  }
}

/**
 * Upload a data URL to Supabase storage
 * Converts the data URL to a File first, then uploads
 *
 * @param dataUrl - The data:// URL to upload
 * @param fileName - The filename for the uploaded file
 * @returns Promise<string> - The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadDataUrlToStorage(dataUrl: string, fileName: string): Promise<string> {
  try {
    // Fetch the blob from the data URL
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Determine content type from blob or default to image/png
    const contentType = blob.type || 'image/png';

    // Create a File from the blob
    const file = new File([blob], fileName, { type: contentType });

    // Upload using the main upload function
    return await uploadFileToStorage(file);
  } catch (error) {
    console.error('❌ Data URL upload error:', error);
    throw error;
  }
}

/**
 * Check if a URL is a blob URL that needs to be uploaded
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

/**
 * Check if a URL is a data URL that needs to be uploaded
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Check if a URL needs to be uploaded (blob or data URL)
 */
export function needsUpload(url: string): boolean {
  return isBlobUrl(url) || isDataUrl(url);
}
