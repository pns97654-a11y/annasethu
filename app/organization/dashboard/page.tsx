'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';

type Donation = {
  id: string;
  foodName: string;
  category: string | null;
  dietType: string;
  servingsRemaining: number;
  collectionDeadline: string;
  isUrgent: boolean;
  donorName: string;
  location: { approxAreaLabel: string; city: string };
};

export default function OrganizationDashboard() {
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [dietFilter, setDietFilter] = useState('');
  const [requestAmount, setRequestAmount] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams({ status: 'AVAILABLE' });
    if (dietFilter) params.set('dietType', dietFilter);
    const res = await fetch(`/api/donations?${params.toString()}`);
    const data = await res.json();
    setDonations(data.donations);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietFilter]);

  async function requestFood(id: string) {
    setMessage(null);
    const servingsRequested = requestAmount[id] || 10;
    const res = await fetch(`/api/donations/${id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servingsRequested })
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Could not submit request.');
      return;
    }
    setMessage('Request sent to the donor.');
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Available food nearby</h1>
        <select className="input !w-auto" value={dietFilter} onChange={(e) => setDietFilter(e.target.value)}>
          <option value="">All diet types</option>
          <option value="VEG">Vegetarian</option>
          <option value="NON_VEG">Non-vegetarian</option>
          <option value="VEGAN">Vegan</option>
        </select>
      </div>

      {message && <p className="text-sm bg-leaf-50 text-leaf-800 rounded-lg px-3 py-2 mb-4">{message}</p>}

      {!donations ? (
        <p className="text-black/40">Loading…</p>
      ) : donations.length === 0 ? (
        <div className="card p-10 text-center text-black/50">No food currently available in your area.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {donations.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold">{d.foodName}</h3>
                {d.isUrgent && <span className="badge bg-red-100 text-red-700">🔴 Urgent</span>}
              </div>
              <p className="text-sm text-black/50 mb-2">
                {d.servingsRemaining} servings · {d.dietType.replace('_', '-')} · {d.location.approxAreaLabel}, {d.location.city}
              </p>
              <p className="text-xs text-black/40 mb-3">
                {d.donorName} · Pickup before {new Date(d.collectionDeadline).toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={d.servingsRemaining}
                  className="input !w-24"
                  value={requestAmount[d.id] ?? Math.min(10, d.servingsRemaining)}
                  onChange={(e) => setRequestAmount({ ...requestAmount, [d.id]: Number(e.target.value) })}
                />
                <button onClick={() => requestFood(d.id)} className="btn-primary !py-1.5 !px-3 text-sm">Request</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
