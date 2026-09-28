'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeliveryRegisterPage() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState('BIKE');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreedToTerms) {
      setError('You must agree to the platform terms.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/delivery-partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleType, agreedToTerms })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not submit profile.');
      return;
    }
    router.push('/delivery/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Become a delivery partner</h1>
      <p className="text-black/50 mb-6">
        If you don&rsquo;t have an account yet, <a href="/register" className="text-leaf-700 underline">create one first</a> as a Delivery Partner.
        An admin verifies your profile before you can accept jobs.
      </p>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="label">Vehicle type</label>
          <select className="input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="BIKE">Bike</option>
            <option value="SCOOTER">Scooter</option>
            <option value="CAR">Car</option>
            <option value="VAN">Van</option>
            <option value="BICYCLE">Bicycle</option>
            <option value="ON_FOOT">On foot</option>
          </select>
        </div>
        <p className="text-xs text-black/40">
          Identity verification and payout details can be added after your account is created — an
          admin will follow up if anything further is required.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
          I agree to the annadharaa delivery partner terms and food-handling guidance.
        </label>
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Submitting…' : 'Submit for verification'}</button>
      </form>
    </div>
  );
}
