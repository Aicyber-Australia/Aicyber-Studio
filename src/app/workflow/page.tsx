import { Metadata } from 'next/types';
import { redirect } from 'next/navigation';

import SidebarLayout from './layouts/sidebar-layout';
import Workflow from './components/workflow';
import AgentChat from '@/components/agent-chat';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'React Flow Workflow Template',
  description:
    'A Next.js-based React Flow template designed to help you quickly create, manage, and visualize workflows.',
};

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <SidebarLayout>
      <Workflow />
      <AgentChat />
    </SidebarLayout>
  );
}
