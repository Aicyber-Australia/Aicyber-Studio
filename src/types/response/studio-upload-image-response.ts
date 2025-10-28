/**
 * Successful response from studio-upload-image endpoint
 */
export interface StudioUploadImageSuccessResponse {
  /**
   * Success message
   */
  message: string;

  /**
   * Public URL of the uploaded image
   */
  url: string;

  /**
   * Filename in storage (includes user ID path and hash)
   */
  filename: string;

  /**
   * SHA-256 hash of the image content
   */
  hash: string;

  /**
   * Whether the file was deduplicated (already existed)
   */
  deduplicated: boolean;
}

/**
 * Error response from studio-upload-image endpoint
 */
export interface StudioUploadImageErrorResponse {
  /**
   * Error message
   */
  error: string;
}

/**
 * Union type for all possible responses
 */
export type StudioUploadImageApiResponse =
  | StudioUploadImageSuccessResponse
  | StudioUploadImageErrorResponse;
