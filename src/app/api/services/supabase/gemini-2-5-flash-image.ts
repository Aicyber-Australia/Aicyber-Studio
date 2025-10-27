import { ImageCreateRequest } from '@/types/request/image-create-request';
import { SupabaseImageResponse, SupabaseImageErrorResponse } from '@/types/response/image-response';
import { callEdgeFunction } from './edge-function-client';

const EDGE_FUNCTION_NAME = 'gemini-2-5-flash-image';

/**
 * Call the gemini-2-5-flash-image Supabase edge function
 * This function processes images using Google's Gemini 2.5 Flash model
 */
export async function gemini25FlashImage(
  request: ImageCreateRequest
): Promise<SupabaseImageResponse> {
  return callEdgeFunction<SupabaseImageResponse>({
    functionName: EDGE_FUNCTION_NAME,
    body: request,
  });
}

/**
 * Type guard to check if the response is an error
 */
export function isGeminiImageError(
  response: SupabaseImageResponse
): response is SupabaseImageErrorResponse {
  return 'error' in response;
}

/**
 * Helper function to handle the response and extract URLs
 */
export function extractGeminiImageUrls(response: SupabaseImageResponse): string[] {
  if (isGeminiImageError(response)) {
    throw new Error(response.error);
  }

  const url = response.url;
  return Array.isArray(url) ? url : [url];
}
