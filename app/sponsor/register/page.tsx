'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SponsorRegisterPage() {
  const router = useRouter();
  const [sponsorType, setSponsorType] = useState('COMPANY');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/sponsors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sponsorType, displayName })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not create sponsor profile.');
      return;
    }
    router.push('/sponsor/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Become a sponsor</h1>
      <p className="text-black/50 mb-6">
        If you don&rsquo;t have an account yet, <a href="/register" className="text-leaf-700 underline">create one first</a> as a Sponsor.
        Real payment processing isn&rsquo;t wired up in this build — see the README.
      </p>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="label">Sponsor type</label>
          <select className="input" value={sponsorType} onChange={(e) => setSponsorType(e.target.value)}>
            <option value="COMPANY">Company</option>
            <option value="FOUNDATION">Foundation</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="CSR_PROGRAM">CSR program</option>
            <option value="PHILANTHROPIC_ORG">Philanthropic organization</option>
          </select>
        </div>
        <div>
          <label className="label">Display name</label>
          <input required className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Submitting…' : 'Create sponsor profile'}</button>
      </form>
    </div>
  );
}
