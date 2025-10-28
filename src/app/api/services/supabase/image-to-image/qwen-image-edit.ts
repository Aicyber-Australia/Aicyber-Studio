import { ImageCreateRequest } from '@/types/request/image-create-request';
import { SupabaseImageResponse, SupabaseImageErrorResponse } from '@/types/response/image-response';
import { callEdgeFunction } from '../edge-function-client';

const EDGE_FUNCTION_NAME = 'qwen-image-edit';

/**
 * Call the qwen-image-edit Supabase edge function
 * This function edits images based on the provided prompt using Qwen model
 */
export async function qwenImageEdit(
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
export function isQwenImageEditError(
  response: SupabaseImageResponse
): response is SupabaseImageErrorResponse {
  return 'error' in response;
}

/**
 * Helper function to handle the response and extract URLs
 */
export function extractQwenImageUrls(response: SupabaseImageResponse): string[] {
  if (isQwenImageEditError(response)) {
    throw new Error(response.error);
  }

  const url = response.url;
  return Array.isArray(url) ? url : [url];
}
