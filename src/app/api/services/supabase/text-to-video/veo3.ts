import { TextToVideoRequest } from '@/types/request/text-to-video-request';
import { VeoTextToImgErrorResponse, VeoTextToImgApiResponse } from '@/types/response/veo-text-to-img-response';
import { VideoPollingApiResponse, VideoPollingErrorResponse } from '@/types/response/video-polling-response';
import { callEdgeFunction } from '../edge-function-client';

const EDGE_FUNCTION_NAME = 'veo-text-to-video';
const QUERY_FUNCTION_NAME = 'veo-query';

/**
 * Call the veo-text-to-video Supabase edge function
 * This function generates videos from text prompts using Google's Veo 3 model
 */
export async function veoTextToVideo(
  request: TextToVideoRequest
): Promise<VeoTextToImgApiResponse> {
  return callEdgeFunction<VeoTextToImgApiResponse>({
    functionName: EDGE_FUNCTION_NAME,
    body: request,
  });
}

/**
 * Type guard to check if the response is an error
 */
export function isVeoTextToVideoError(
  response: VeoTextToImgApiResponse
): response is VeoTextToImgErrorResponse {
  return 'error' in response;
}

/**
 * Helper function to handle the response and extract video metadata
 */
export function extractVideoMetadata(response: VeoTextToImgApiResponse): { name: string; userId: string } {
  if (isVeoTextToVideoError(response)) {
    throw new Error(response.error);
  }

  return {
    name: response.name,
    userId: response.userId,
  };
}

/**
 * Query the status of a video generation operation
 * @param operationName - The operation name returned from veoTextToVideo
 */
export async function veoQuery(
  operationName: string
): Promise<VideoPollingApiResponse> {
  return callEdgeFunction<VideoPollingApiResponse>({
    functionName: QUERY_FUNCTION_NAME,
    method: 'GET',
    queryParams: {
      operation_name: operationName,
    },
  });
}

/**
 * Type guard to check if the polling response is an error
 */
export function isVeoQueryError(
  response: VideoPollingApiResponse
): response is VideoPollingErrorResponse {
  return 'error' in response;
}

/**
 * Helper function to extract the video URL from a successful polling response
 */
export function extractVideoUrl(response: VideoPollingApiResponse): string | null {
  if (isVeoQueryError(response)) {
    throw new Error(response.error);
  }

  return response.url || null;
}
