'use client';

import { useHandleStore } from '@/store/handle-store';

export function DebugPanel() {
  const { handleData } = useHandleStore();
  
  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg max-w-sm">
      <h3 className="font-bold mb-2">Handle Store Debug</h3>
      <pre className="text-xs overflow-auto max-h-64">
        {JSON.stringify(handleData, null, 2)}
      </pre>
    </div>
  );
}
