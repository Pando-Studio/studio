import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // Check user status from DB (session may not have the latest status)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, role: true },
  });

  if (!user) {
    redirect('/login');
  }

  // Admins always have access
  if (user.role !== 'admin') {
    if (user.status === 'pending') {
      redirect('/pending-approval');
    }

    if (user.status === 'suspended') {
      redirect('/login');
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
