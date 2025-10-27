/**
 * Request type for studio image upload
 * This endpoint accepts raw image data (File, Blob, or ArrayBuffer)
 */
export interface StudioUploadImageRequest {
  /**
   * The image data to upload
   * Can be a File, Blob, or ArrayBuffer
   */
  imageData: File | Blob | ArrayBuffer;

  /**
   * The content type of the image (e.g., 'image/png', 'image/jpeg')
   */
  contentType: string;
}
