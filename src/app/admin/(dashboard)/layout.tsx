import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, COOKIE_NAME } from '@/lib/admin/session';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie || !verifySessionToken(sessionCookie.value)) {
    redirect('/admin/login');
  }

  return <AdminShell>{children}</AdminShell>;
}
