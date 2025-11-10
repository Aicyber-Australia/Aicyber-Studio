import { Metadata } from 'next/types';
import { redirect } from 'next/navigation';

import SidebarLayout from './layouts/sidebar-layout';
import Workflow from './components/workflow';
import AgentChat from '@/components/agent-chat';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'AICYBER Studio',
  description:
    'AICYBER Studio - Empowering Creativity with AI-Driven Workflows',
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
