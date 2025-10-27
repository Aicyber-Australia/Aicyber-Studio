import { supabase } from '@/lib/supabase/client';
import { SupabaseImageResponse } from '@/types/response/image-response';

export interface EdgeFunctionOptions {
  functionName: string;
  body?: any;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  queryParams?: Record<string, string>;
  /**
   * Whether to include the user's auth token in the Authorization header
   * Default: true
   */
  includeAuth?: boolean;
}

/**
 * Call a Supabase Edge Function
 */
// export async function callEdgeFunction<T = SupabaseImageResponse>(
//   options: EdgeFunctionOptions
// ): Promise<T> {
//   try {
//     // Build the function path with query parameters if provided
//     let functionPath = options.functionName;
//     if (options.queryParams) {
//       const params = new URLSearchParams(options.queryParams);
//       functionPath = `${options.functionName}?${params.toString()}`;
//     }

//     // Get auth token (default: true)
//     const headers: Record<string, string> = {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     };

//     if (options.includeAuth !== false) {
//       const token = await getAuthToken();
//       if (token) {
//         headers['Authorization'] = `Bearer ${token}`;
//       }
//     }

//     const { data, error } = await supabase.functions.invoke(functionPath, {
//       body: options.method === 'GET' ? undefined : options.body,
//       headers,
//       method: options.method || 'POST',
//     });

//     if (error) {
//       throw new Error(`Edge function error: ${error.message}`);
//     }

//     if (!data) {
//       throw new Error('No data returned from edge function');
//     }

//     return data as T;
//   } catch (error) {
//     console.error(`Error calling edge function ${options.functionName}:`, error);
//     throw error;
//   }
// }

/**
 * Call a Supabase Edge Function
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function toHttpMethod(value?: string): HttpMethod | undefined {
  if (!value) return undefined;
  const up = value.toUpperCase();
  if (up === 'GET' || up === 'POST' || up === 'PUT' || up === 'PATCH' || up === 'DELETE') {
    return up;
  }
  return undefined;
}

// Convert a Uint8Array view to an exact ArrayBuffer slice (no extra bytes)
function uint8ToArrayBuffer(u8: Uint8Array): any {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

// Narrow/normalize body to something acceptable as BodyInit
function normalizeBodyForFetch(
  rawBody: unknown,
  headers: Record<string, string>
): BodyInit | undefined {
  if (rawBody == null) return undefined;

  // Binary / multipart: pass through and DO NOT force JSON content-type
  if (typeof FormData !== 'undefined' && rawBody instanceof FormData) {
    return rawBody;
  }
  if (typeof Blob !== 'undefined' && rawBody instanceof Blob) {
    return rawBody;
  }
  if (typeof ArrayBuffer !== 'undefined' && rawBody instanceof ArrayBuffer) {
    return rawBody;
  }
  if (typeof Uint8Array !== 'undefined' && rawBody instanceof Uint8Array) {
    return uint8ToArrayBuffer(rawBody); // <-- fix: make it a proper ArrayBuffer
  }

  // String body: pass through; set JSON header only if it "looks" like JSON and no header is set
  if (typeof rawBody === 'string') {
    if (!('Content-Type' in headers)) {
      const t = rawBody.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        headers['Content-Type'] = 'application/json';
      }
    }
    return rawBody;
  }

  // Plain object → JSON stringify
  headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  return JSON.stringify(rawBody);
}

/**
 * Call a Supabase Edge Function
 */
export async function callEdgeFunction<T = SupabaseImageResponse>(
  options: EdgeFunctionOptions
): Promise<T> {
  try {
    // Build the function path with query parameters if provided
    let functionPath = options.functionName;
    if (options.queryParams) {
      const params = new URLSearchParams(options.queryParams);
      functionPath = `${options.functionName}?${params.toString()}`;
    }

    // Resolve/validate method (Edge Functions are typically POST)
    let method: HttpMethod = toHttpMethod(options.method) ?? 'POST';
    if (method !== 'POST') {
      console.warn(
        `[callEdgeFunction] Supabase Edge Functions generally expect POST. Forcing POST (was ${method}).`
      );
      method = 'POST';
    }

    // Prepare headers (don’t set JSON yet; let body normalization decide)
    const headers: Record<string, string> = { ...(options.headers || {}) };

    // Attach auth unless explicitly disabled
    if (options.includeAuth !== false) {
      const token = await getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    // Normalize body to a valid BodyInit (fixes TS2322: Uint8Array → ArrayBuffer)
    const bodyToSend: BodyInit | undefined = normalizeBodyForFetch(options.body, headers);

    const { data, error } = await supabase.functions.invoke(functionPath, {
      method,               // ✅ typed as HttpMethod
      headers,
      body: bodyToSend,     // ✅ typed as BodyInit | undefined
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    if (data == null) {
      throw new Error('No data returned from edge function');
    }

    return data as T;
  } catch (error) {
    console.error(`Error calling edge function ${options.functionName}:`, error);
    throw error;
  }
}



/**
 * Get authentication token from the current session
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
