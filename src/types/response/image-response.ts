
// Supabase Edge Function Image Response types - Success responses
export interface SupabaseImageResponseBase {
  status: "completed" | "processing" | "failed";
  url: string | string[];
}

export interface SupabaseImageResponseWithTask extends SupabaseImageResponseBase {
  task_id: string;
  url: string | string[];
  request_id?: string;
}

export interface SupabaseImageResponseWithDimensions extends SupabaseImageResponseBase {
  url: string;
  width: number | null;
  height: number | null;
  request_id?: string;
}

export interface SupabaseImageResponseSimple extends SupabaseImageResponseBase {
  url: string;
}

// Error response
export interface SupabaseImageErrorResponse {
  authenticated?: boolean;
  error: string;
}

export type SupabaseImageResponse =
  | SupabaseImageResponseWithTask
  | SupabaseImageResponseWithDimensions
  | SupabaseImageResponseSimple
  | SupabaseImageErrorResponse;
