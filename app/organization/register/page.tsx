'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('NGO');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [peopleServed, setPeopleServed] = useState(30);
  const [typicalMealsRequired, setTypicalMealsRequired] = useState(60);
  const [operatingHours, setOperatingHours] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName,
        organizationType,
        contactPersonName,
        contactPhone,
        address: { line1, city, approxAreaLabel: `Near ${city}`, country: 'India' },
        peopleServed: Number(peopleServed),
        typicalMealsRequired: Number(typicalMealsRequired),
        operatingHours
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not submit organization profile.');
      return;
    }
    router.push('/organization/dashboard');
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Register your organization</h1>
      <p className="text-black/50 mb-6">
        An administrator will review your details before you can request food. If you don&rsquo;t have an
        account yet, <a href="/register" className="text-leaf-700 underline">create one first</a> as an Organization.
      </p>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="label">Organization name</label>
          <input required className="input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </div>
        <div>
          <label className="label">Organization type</label>
          <select className="input" value={organizationType} onChange={(e) => setOrganizationType(e.target.value)}>
            <option value="ORPHANAGE">Orphanage / children&rsquo;s home</option>
            <option value="OLD_AGE_HOME">Old-age home</option>
            <option value="SHELTER">Shelter</option>
            <option value="NGO">NGO</option>
            <option value="COMMUNITY_KITCHEN">Community kitchen</option>
            <option value="DISASTER_RELIEF">Disaster-relief organization</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact person</label>
            <input required className="input" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} />
          </div>
          <div>
            <label className="label">Contact phone</label>
            <input required className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input required className="input mb-2" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address" />
          <input required className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">People served</label>
            <input type="number" min={1} required className="input" value={peopleServed} onChange={(e) => setPeopleServed(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Typical meals required</label>
            <input type="number" min={1} required className="input" value={typicalMealsRequired} onChange={(e) => setTypicalMealsRequired(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Operating hours (optional)</label>
          <input className="input" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="e.g. 8 AM – 8 PM" />
        </div>
        <p className="text-xs text-black/40">
          Registration documents (e.g. registration certificate) can be uploaded after your account
          is created — an admin will follow up if anything further is required.
        </p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Submitting…' : 'Submit for verification'}</button>
      </form>
    </div>
  );
}
