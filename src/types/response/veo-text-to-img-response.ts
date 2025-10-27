export interface VeoTextToImgResponse {
    name: string;
    userId: string;
}

export interface VeoTextToImgErrorResponse {
    authenticated?: boolean;
    error: string;
}

export type VeoTextToImgApiResponse = VeoTextToImgResponse | VeoTextToImgErrorResponse;