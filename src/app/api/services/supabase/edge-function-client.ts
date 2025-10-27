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

    // Get auth token (default: true)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.includeAuth !== false) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const { data, error } = await supabase.functions.invoke(functionPath, {
      body: options.method === 'GET' ? undefined : options.body,
      headers,
      method: options.method || 'POST',
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data) {
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
