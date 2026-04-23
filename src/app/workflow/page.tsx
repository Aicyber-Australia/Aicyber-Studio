import { Metadata } from 'next/types';

import SidebarLayout from './layouts/sidebar-layout';
import Workflow from './components/workflow';
import AgentChat from '@/components/agent-chat';

export const metadata: Metadata = {
  title: 'AICYBER Studio',
  description:
    'AICYBER Studio - Empowering Creativity with AI-Driven Workflows',
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <SidebarLayout>
      <Workflow />
      <AgentChat />
    </SidebarLayout>
  );
}
