import { StudioUploadImageRequest } from '@/types/request/studio-upload-image-request';
import { StudioUploadImageApiResponse, StudioUploadImageErrorResponse } from '@/types/response/studio-upload-image-response';
import { callEdgeFunction } from './edge-function-client';

const EDGE_FUNCTION_NAME = 'studio-upload-image';

/**
 * Upload an image to studio storage
 * This function uploads images to Supabase storage with automatic deduplication
 * based on SHA-256 hash of the image content.
 *
 * The endpoint:
 * - Requires authentication (Authorization header with Bearer token)
 * - Accepts raw image data (File, Blob, or ArrayBuffer)
 * - Stores images in user-specific folders (userId/hash.extension)
 * - Automatically deduplicates identical images
 * - Returns public URL of the uploaded image
 */
export async function studioUploadImage(
  request: StudioUploadImageRequest
): Promise<StudioUploadImageApiResponse> {
  // Convert the image data to the format expected by the edge function
  let bodyData: ArrayBuffer;

  if (request.imageData instanceof Blob || request.imageData instanceof File) {
    bodyData = await request.imageData.arrayBuffer();
  } else if (request.imageData instanceof ArrayBuffer) {
    bodyData = request.imageData;
  } else {
    throw new Error('Invalid image data type');
  }

  return callEdgeFunction<StudioUploadImageApiResponse>({
    functionName: EDGE_FUNCTION_NAME,
    body: bodyData,
    headers: {
      'Content-Type': request.contentType,
    },
    // Auth is included by default
    method: 'POST',
  });
}

/**
 * Type guard to check if the response is an error
 */
export function isStudioUploadError(
  response: StudioUploadImageApiResponse
): response is StudioUploadImageErrorResponse {
  return 'error' in response;
}

/**
 * Helper function to extract the URL from a successful upload response
 */
export function extractUploadedUrl(response: StudioUploadImageApiResponse): string {
  if (isStudioUploadError(response)) {
    throw new Error(response.error);
  }

  return response.url;
}

/**
 * Helper function to check if the upload was deduplicated (file already existed)
 */
export function wasFileDeduplicated(response: StudioUploadImageApiResponse): boolean {
  if (isStudioUploadError(response)) {
    return false;
  }

  return response.deduplicated;
}
