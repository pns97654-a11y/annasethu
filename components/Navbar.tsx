'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Me = { id: string; fullName: string; role: string } | null;

const DASHBOARD_BY_ROLE: Record<string, string> = {
  DONOR: '/donor/dashboard',
  ORGANIZATION: '/organization/dashboard',
  DELIVERY_PARTNER: '/delivery/dashboard',
  SPONSOR: '/sponsor/dashboard',
  ADMIN: '/admin/dashboard'
};

export default function Navbar() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <header className="border-b border-black/5 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-leaf-700">
          <span aria-hidden>🍲</span> Annasethu
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-black/70">
          <Link href="/how-it-works" className="hover:text-leaf-700">How It Works</Link>
          <Link href="/impact" className="hover:text-leaf-700">Impact</Link>
          <Link href="/food-safety" className="hover:text-leaf-700">Food Safety</Link>
          <Link href="/organization/register" className="hover:text-leaf-700">For Organizations</Link>
          <Link href="/delivery/register" className="hover:text-leaf-700">Become a Delivery Partner</Link>
        </nav>
        <button
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  className="md:hidden text-2xl order-2"
  aria-label="Toggle menu"
>
  ☰
</button>
 {mobileMenuOpen && (
  <div className="md:hidden absolute top-16 right-4 bg-white border border-black/10 rounded-lg shadow-lg p-4 flex flex-col gap-4 z-50">
  <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)}>
    How It Works
  </Link>

  <Link href="/impact" onClick={() => setMobileMenuOpen(false)}>
    Impact
  </Link>

  <Link href="/food-safety" onClick={() => setMobileMenuOpen(false)}>
    Food Safety
  </Link>

  <Link href="/organization/register" onClick={() => setMobileMenuOpen(false)}>
    For Organizations
  </Link>

  <Link href="/delivery/register" onClick={() => setMobileMenuOpen(false)}>
    Become a Delivery Partner
  </Link>
</div>
 )}
        <div className="flex items-center gap-3 order-1 md:order-none">
          {!loading && !me && (
            <>
              <Link href="/login" className="text-sm font-medium text-black/70 hover:text-leaf-700">Log in</Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 text-sm">Get started</Link>
            </>
          )}
          {!loading && me && (
            <>
              <Link
  href={DASHBOARD_BY_ROLE[me.role] ?? '/'}
  className="hidden md:inline text-sm font-medium text-black/70 hover:text-leaf-700"
>
  Dashboard
</Link>

<Link
  href={DASHBOARD_BY_ROLE[me.role] ?? '/'}
  className="text-sm font-medium text-black/70 hover:text-leaf-700"
>
  Hi, {me.fullName.split(' ')[0]}
</Link>

<button onClick={logout} className="btn-secondary !py-2 !px-4 text-sm">
  Log out
</button>
            
            </>
          )}
        </div>
      </div>
    </header>
  );
}
