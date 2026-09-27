'use client';

import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [pendingOrgs, setPendingOrgs] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pendingPartnersList, setPendingPartnersList] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [statsRes, orgsRes, partnersRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/organizations?status=PENDING'),
      fetch('/api/delivery-partners?status=PENDING')
    ]);
    setStats(await statsRes.json());
    setPendingOrgs((await orgsRes.json()).organizations ?? []);
    setPendingPartnersList((await partnersRes.json()).partners ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function verifyOrg(id: string, decision: 'VERIFIED' | 'REJECTED') {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/organizations/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error);
    setMessage(`Organization ${decision === 'VERIFIED' ? 'verified' : 'rejected'}.`);
    load();
  }

  async function verifyPartner(id: string, decision: 'VERIFIED' | 'REJECTED') {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/delivery-partners/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error);
    setMessage(`Delivery partner ${decision === 'VERIFIED' ? 'verified' : 'rejected'}.`);
    load();
  }

  if (!stats) return <div className="max-w-5xl mx-auto px-4 py-10 text-black/40">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin dashboard</h1>
      {message && <p className="text-sm bg-leaf-50 text-leaf-800 rounded-lg px-3 py-2 mb-4">{message}</p>}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total donations" value={stats.donations.total} />
        <StatCard label="Active donations" value={stats.donations.active} />
        <StatCard label="Meals rescued" value={stats.mealsRescued} />
        <StatCard label="Completed deliveries" value={stats.deliveries.completed} />
        <StatCard label="Verified organizations" value={stats.organizations.verified} />
        <StatCard label="Orgs pending verification" value={stats.organizations.pendingVerification} highlight />
        <StatCard label="Delivery partners" value={stats.deliveryPartners.total} />
        <StatCard label="Avg delivery time (min)" value={stats.deliveries.avgDeliveryMinutes ?? '—'} />
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-4">Organizations awaiting verification</h2>
        {pendingOrgs.length === 0 ? (
          <p className="text-sm text-black/40">Nothing pending review.</p>
        ) : (
          <div className="space-y-2">
            {pendingOrgs.map((o) => (
              <div key={o.id} className="flex items-center justify-between border border-black/5 rounded-lg p-3">
                <div>
                  <div className="font-medium">{o.organizationName}</div>
                  <div className="text-xs text-black/50">
                    {o.organizationType.replaceAll('_', ' ')} · {o.city} · serves ~{o.peopleServed} people
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <StatusBadge status={o.verificationStatus} />
                  <button disabled={busy} onClick={() => verifyOrg(o.id, 'VERIFIED')} className="btn-primary !py-1.5 !px-3 text-sm">Verify</button>
                  <button disabled={busy} onClick={() => verifyOrg(o.id, 'REJECTED')} className="btn-secondary !py-1.5 !px-3 text-sm">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 mt-6">
        <h2 className="font-semibold mb-4">Delivery partners awaiting verification</h2>
        {pendingPartnersList.length === 0 ? (
          <p className="text-sm text-black/40">Nothing pending review.</p>
        ) : (
          <div className="space-y-2">
            {pendingPartnersList.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-black/5 rounded-lg p-3">
                <div>
                  <div className="font-medium">{p.fullName}</div>
                  <div className="text-xs text-black/50">{p.vehicleType}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <StatusBadge status={p.verificationStatus} />
                  <button disabled={busy} onClick={() => verifyPartner(p.id, 'VERIFIED')} className="btn-primary !py-1.5 !px-3 text-sm">Verify</button>
                  <button disabled={busy} onClick={() => verifyPartner(p.id, 'REJECTED')} className="btn-secondary !py-1.5 !px-3 text-sm">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight && Number(value) > 0 ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-black/50">{label}</div>
    </div>
  );
}
