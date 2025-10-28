export interface VideoPollingResponse {
    finished: boolean;
    url?: string;
}

export interface VideoPollingErrorResponse {
    error: string;
    errorCode?: string;
}

export type VideoPollingApiResponse = VideoPollingResponse | VideoPollingErrorResponse;