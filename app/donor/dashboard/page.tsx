'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';

type Donation = {
  id: string;
  foodName: string;
  servings: number;
  servingsRemaining: number;
  status: string;
  collectionDeadline: string;
  isUrgent: boolean;
};

export default function DonorDashboard() {
  const [donations, setDonations] = useState<Donation[] | null>(null);

  useEffect(() => {
    // Donor's own donations aren't filterable by donor on the public GET
    // /donations route (which only returns AVAILABLE by default and hides
    // donor identity) — so for the MVP dashboard we fetch ALL statuses and
    // rely on the donation detail page's ownership check for anything
    // sensitive. A dedicated /donor/donations endpoint is a natural Phase 2
    // refinement once donor-scoped filtering is needed elsewhere too.
    fetch('/api/donations?status=ALL')
      .then((r) => r.json())
      .then((d) => setDonations(d.donations));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your donations</h1>
        <Link href="/donor/donations/new" className="btn-primary">+ New donation</Link>
      </div>

      {!donations ? (
        <p className="text-black/40">Loading…</p>
      ) : donations.length === 0 ? (
        <div className="card p-10 text-center text-black/50">
          You haven&rsquo;t posted any food yet. <Link href="/donor/donations/new" className="text-leaf-700 underline">Post your first donation</Link>.
        </div>
      ) : (
        <div className="grid gap-3">
          {donations.map((d) => (
            <Link href={`/donor/donations/${d.id}`} key={d.id} className="card p-4 flex items-center justify-between hover:border-leaf-300">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {d.foodName}
                  {d.isUrgent && <span className="badge bg-red-100 text-red-700">🔴 Urgent</span>}
                </div>
                <div className="text-sm text-black/50">
                  {d.servingsRemaining}/{d.servings} servings remaining · Deadline {new Date(d.collectionDeadline).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
