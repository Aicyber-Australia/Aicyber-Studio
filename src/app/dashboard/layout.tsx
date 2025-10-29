import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | AICyber Studio',
  description:
    'Your personalized dashboard to explore AI-powered creative tools and resources.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
