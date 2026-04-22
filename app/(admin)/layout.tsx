import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminRootLayout({
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

  if ((session.user as Record<string, unknown>).role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <AdminLayout email={session.user.email}>{children}</AdminLayout>
  );
}
