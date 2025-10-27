import { supabase } from '@/lib/supabase/client';
import { SupabaseImageResponse } from '@/types/response/image-response';

export interface EdgeFunctionOptions {
  functionName: string;
  body: any;
  headers?: Record<string, string>;
}

/**
 * Call a Supabase Edge Function
 */
export async function callEdgeFunction<T = SupabaseImageResponse>(
  options: EdgeFunctionOptions
): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(options.functionName, {
      body: options.body,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
