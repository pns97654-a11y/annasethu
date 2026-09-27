'use client';

import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';

export default function DonationDetailPage({ params }: { params: { id: string } }) {
  const [donation, setDonation] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [dRes, delRes] = await Promise.all([
      fetch(`/api/donations/${params.id}`),
      fetch('/api/deliveries')
    ]);
    const dData = await dRes.json();
    const delData = await delRes.json();
    setDonation(dData.donation);
    setDeliveries(delData.deliveries ?? []);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    load();
  }

  if (!donation) return <div className="max-w-3xl mx-auto px-4 py-10 text-black/40">Loading…</div>;
  async function deleteDonation() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this donation?"
    );

    if (!confirmed) return;

    const res = await fetch(`/api/donations/${params.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not cancel donation.");
      return;
    }

    window.location.href = "/donor/dashboard";
  }
  
  const relatedDeliveries = deliveries.filter((d) => d.foodName === donation.foodName);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-2">
  <h1 className="text-2xl font-bold">{donation.foodName}</h1>

  <div className="flex items-center gap-2">
    <StatusBadge status={donation.status} />

    {donation.status === "AVAILABLE" && (
      <button
        onClick={deleteDonation}
        className="btn-secondary"
      >
        Cancel Donation
      </button>
    )}
  </div>
</div>
      <p className="text-black/50 mb-6">
        {donation.servingsRemaining}/{donation.servings} servings remaining · Deadline{' '}
        {new Date(donation.collectionDeadline).toLocaleString()}
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <section className="card p-5 mb-6">
        <h2 className="font-semibold mb-3">Requests from organizations</h2>
        {donation.requests?.length ? (
          <div className="space-y-2">
            {donation.requests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between border border-black/5 rounded-lg p-3">
                <div>
                  <div className="text-sm font-medium">{r.servingsRequested} servings requested</div>
                  <div className="text-xs text-black/40">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                {r.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => respond(r.id, 'APPROVED')} className="btn-primary !py-1.5 !px-3 text-sm">Approve</button>
                    <button disabled={busy} onClick={() => respond(r.id, 'REJECTED')} className="btn-secondary !py-1.5 !px-3 text-sm">Decline</button>
                  </div>
                ) : (
                  <StatusBadge status={r.status} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-black/40">No requests yet.</p>
        )}
      </section>

      {relatedDeliveries.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Delivery tracking</h2>
          {relatedDeliveries.map((d) => (
            <div key={d.id} className="border border-black/5 rounded-lg p-3 mb-2 last:mb-0">
              <div className="flex items-center justify-between">
                <StatusBadge status={d.status} />
                <span className="text-xs text-black/40">{d.deliveryPartnerName ?? 'Awaiting partner'}</span>
              </div>
              {d.pickupOtp && (
                <p className="text-sm mt-2">
                  Pickup code (share with delivery partner in person): <span className="font-mono font-bold">{d.pickupOtp}</span>
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
