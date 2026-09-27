'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

function formatInr(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export default function SponsorDashboard() {
  const [profile, setProfile] = useState<any>(undefined); // undefined = loading, null = no profile yet

  useEffect(() => {
    fetch('/api/sponsors').then((r) => r.json()).then((d) => setProfile(d.profile));
  }, []);

  if (profile === undefined) return <div className="max-w-3xl mx-auto px-4 py-10 text-black/40">Loading…</div>;

  if (profile === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <p className="text-black/60 mb-4">You haven&rsquo;t set up a sponsor profile yet.</p>
        <Link href="/sponsor/register" className="btn-primary">Set up sponsor profile</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">{profile.displayName}</h1>
      <p className="text-black/50 mb-6">Sponsor dashboard</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-2xl font-bold">{formatInr(profile.totalPledgedCents)}</div>
          <div className="text-xs text-black/50">Total pledged</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold">{formatInr(profile.totalCompletedCents)}</div>
          <div className="text-xs text-black/50">Confirmed contributions</div>
        </div>
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200 mb-8">
        <p className="text-sm text-amber-900">
          Real payment processing isn&rsquo;t connected in this build — pledges below are recorded but
          not charged. See <code>lib/payments.ts</code> for the integration point.
        </p>
      </div>

      <h2 className="font-semibold mb-3">Your pledges</h2>
      {profile.sponsorships.length === 0 ? (
        <p className="text-sm text-black/40">No pledges yet.</p>
      ) : (
        <div className="space-y-2">
          {profile.sponsorships.map((s: any) => (
            <div key={s.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{formatInr(s.amountCents)} — {s.purpose.replaceAll('_', ' ')}</div>
                <div className="text-xs text-black/40">{new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
