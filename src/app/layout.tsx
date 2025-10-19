import { ReactFlowProvider } from '@xyflow/react';

import { ThemeProvider } from '@/components/theme-provider';
import { AppStoreProvider } from '@/app/workflow/store';

import './globals.css';
import { loadData } from './workflow/mock-data';

export default async function WorkflowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              {children}
            </ThemeProvider>
          </ReactFlowProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
