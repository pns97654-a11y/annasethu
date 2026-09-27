'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { value: 'DONOR', label: 'Food Donor', hint: 'I have surplus food to give away' },
  { value: 'ORGANIZATION', label: 'Organization', hint: 'Orphanage, shelter, NGO, community kitchen…' },
  { value: 'DELIVERY_PARTNER', label: 'Delivery Partner', hint: 'I can collect and deliver food' },
  { value: 'SPONSOR', label: 'Sponsor', hint: 'I want to fund delivery & logistics' }
];

const NEXT_STEP_BY_ROLE: Record<string, string> = {
  DONOR: '/donor/dashboard',
  ORGANIZATION: '/organization/register',
  DELIVERY_PARTNER: '/delivery/register',
  SPONSOR: '/sponsor/dashboard'
};

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState('DONOR');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, fullName, email, phone, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Registration failed.');
      return;
    }
    router.push(NEXT_STEP_BY_ROLE[role] ?? '/');
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="label">I am a…</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setRole(opt.value)}
                className={`text-left rounded-lg border px-3 py-2 text-sm ${
                  role === opt.value ? 'border-leaf-600 bg-leaf-50' : 'border-black/10'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-black/50">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-black/40 mt-1">At least 8 characters.</p>
        </div>

        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="text-sm text-black/50 text-center">
          Already have an account? <Link href="/login" className="text-leaf-700 underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
