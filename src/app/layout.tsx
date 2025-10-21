import { ReactFlowProvider } from '@xyflow/react';
import { registerAllServices } from './api/services/service-registrar';

import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast-provider';
import { AppStoreProvider } from '@/app/workflow/store';

import './globals.css';
import "@copilotkit/react-ui/styles.css";
import { loadData } from '../testdata/mock-data';
import { CopilotKit } from "@copilotkit/react-core"; 

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
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          publicLicenseKey={process.env.COPILOT_CLOUD_PUBLIC_LICENSE_KEY!}
        >
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
        </CopilotKit>
      </body>
    </html>
  );
}
