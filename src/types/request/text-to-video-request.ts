interface TextToVideoInput {
    prompt: string;
}

interface TextToVideoParameters {
    duration?: number; // Duration in seconds
    resolution?: '480p' | '720p' | '1080p';
    fps?: number; // Frames per second
    style?: string; // e.g., 'cartoon', 'realistic', etc.
}

export interface TextToVideoRequest {
    input: TextToVideoInput;
    parameters?: TextToVideoParameters;
}

export function isTextToVideoRequest(obj: any): obj is TextToVideoRequest {
    return (
        obj &&
        typeof obj === 'object' &&
        'input' in obj &&
        typeof obj.input === 'object' &&
        'prompt' in obj.input &&
        typeof obj.input.prompt === 'string'
    );
}