'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects the root path to the workflow editor.
 * Using client-side redirect for static export compatibility.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workflow');
  }, [router]);

  return null;
}
