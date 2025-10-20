import { ReactFlowProvider } from '@xyflow/react';
import { registerAllServices } from './api/services/service-registrar';

import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast-provider';
import { AppStoreProvider } from '@/app/workflow/store';

import './globals.css';
import { loadData } from '../testdata/mock-data';

export default async function WorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // global register all services
  registerAllServices();
  const { nodes, edges } = await loadData();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppStoreProvider initialState={{ nodes, edges }}>
          <ReactFlowProvider initialNodes={nodes} initialEdges={edges}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ToastProvider>
                {children}
              </ToastProvider>
            </ThemeProvider>
          </ReactFlowProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
