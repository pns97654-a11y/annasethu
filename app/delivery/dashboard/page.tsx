'use client';

import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';

const NEXT_STATUS: Record<string, string> = {
  ASSIGNED: 'EN_ROUTE_TO_PICKUP',
  EN_ROUTE_TO_PICKUP: 'PICKED_UP',
  PICKED_UP: 'EN_ROUTE_TO_DROPOFF',
  EN_ROUTE_TO_DROPOFF: 'DELIVERED'
};

const NEXT_LABEL: Record<string, string> = {
  ASSIGNED: 'Start heading to pickup',
  EN_ROUTE_TO_PICKUP: 'Confirm pickup (enter code)',
  PICKED_UP: 'Start heading to drop-off',
  EN_ROUTE_TO_DROPOFF: 'Confirm delivery (enter code)'
};

export default function DeliveryDashboard() {
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [openRes, mineRes] = await Promise.all([
      fetch('/api/deliveries?scope=open'),
      fetch('/api/deliveries?scope=mine')
    ]);
    setOpenJobs((await openRes.json()).deliveries ?? []);
    setMyJobs((await mineRes.json()).deliveries ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(id: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/deliveries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ASSIGNED' })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error);
    setMessage('Job accepted. Pickup address is now visible below.');
    load();
  }

  async function advance(id: string, currentStatus: string) {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;
    const needsOtp = nextStatus === 'PICKED_UP' || nextStatus === 'DELIVERED';
    const otp = otpInputs[id];
    if (needsOtp && !otp) {
      setMessage('Enter the verification code first.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/deliveries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, otp })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error);
    setMessage(`Delivery updated to ${nextStatus.replaceAll('_', ' ')}.`);
    load();
  }

  const activeJobs = myJobs.filter((j) => j.status !== 'DELIVERED' && j.status !== 'CANCELLED');
  const pastJobs = myJobs.filter((j) => j.status === 'DELIVERED' || j.status === 'CANCELLED');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Delivery dashboard</h1>
      {message && <p className="text-sm bg-leaf-50 text-leaf-800 rounded-lg px-3 py-2 mb-4">{message}</p>}

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Active deliveries</h2>
        {activeJobs.length === 0 ? (
          <p className="text-sm text-black/40">No active deliveries.</p>
        ) : (
          <div className="grid gap-3">
            {activeJobs.map((j) => (
              <div key={j.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{j.foodName}</span>
                  <StatusBadge status={j.status} />
                </div>
                <div className="text-sm text-black/60 grid md:grid-cols-2 gap-2 mb-3">
                  <div>
                    <span className="text-black/40">Pickup: </span>
                    {j.pickupAddress?.line1 ? `${j.pickupAddress.line1}, ${j.pickupAddress.city}` : `${j.pickupAddress.approxAreaLabel}, ${j.pickupAddress.city}`}
                  </div>
                  <div>
                    <span className="text-black/40">Drop-off: </span>
                    {j.dropoffAddress?.line1 ? `${j.dropoffAddress.line1}, ${j.dropoffAddress.city}` : `${j.dropoffAddress.approxAreaLabel}, ${j.dropoffAddress.city}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(j.status === 'EN_ROUTE_TO_PICKUP' || j.status === 'EN_ROUTE_TO_DROPOFF') && (
                    <input
                      className="input !w-32"
                      placeholder="Enter code"
                      value={otpInputs[j.id] ?? ''}
                      onChange={(e) => setOtpInputs({ ...otpInputs, [j.id]: e.target.value })}
                    />
                  )}
                  <button disabled={busy} onClick={() => advance(j.id, j.status)} className="btn-primary !py-1.5 !px-3 text-sm">
                    {NEXT_LABEL[j.status] ?? 'Update'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Open delivery jobs</h2>
        {openJobs.length === 0 ? (
          <p className="text-sm text-black/40">No open jobs right now.</p>
        ) : (
          <div className="grid gap-3">
            {openJobs.map((j) => (
              <div key={j.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{j.foodName}</div>
                  <div className="text-sm text-black/50">
                    Pickup near {j.pickupAddress.approxAreaLabel}, {j.pickupAddress.city} → Drop-off near {j.dropoffAddress.approxAreaLabel}, {j.dropoffAddress.city}
                  </div>
                </div>
                <button disabled={busy} onClick={() => accept(j.id)} className="btn-primary !py-1.5 !px-3 text-sm">Accept job</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {pastJobs.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">History</h2>
          <div className="grid gap-2">
            {pastJobs.map((j) => (
              <div key={j.id} className="card p-3 flex items-center justify-between text-sm">
                <span>{j.foodName}</span>
                <StatusBadge status={j.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
