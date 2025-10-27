interface ImageCreateInput {
    prompt: string;
    images: string[]; // Array of image URLs
}

interface ImageCreateParameters {
    n?: number;
    size?: '256x256' | '512x512' | '1024x1024';
}

export interface ImageCreateRequest {
    input: ImageCreateInput;
    parameters?: ImageCreateParameters;
}

export function isImageCreateRequest(obj: any): obj is ImageCreateRequest {
    return (
        obj &&
        typeof obj === 'object' &&
        'input' in obj &&
        typeof obj.input === 'object' &&
        'prompt' in obj.input &&
        typeof obj.input.prompt === 'string' &&
        'images' in obj.input &&
        Array.isArray(obj.input.images)
    );
}