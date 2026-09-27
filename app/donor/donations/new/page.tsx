'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewDonationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [foodName, setFoodName] = useState('');
  const [dietType, setDietType] = useState('VEG');
  const [servings, setServings] = useState(20);
  const [approxQuantity, setApproxQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [preparedAt, setPreparedAt] = useState(toLocalDatetimeValue(new Date()));
  const [collectionDeadline, setCollectionDeadline] = useState(
    toLocalDatetimeValue(new Date(Date.now() + 3 * 3600 * 1000))
  );
  const [storageCondition, setStorageCondition] = useState('ROOM_TEMPERATURE');
  const [wasRefrigerated, setWasRefrigerated] = useState(false);
  const [allergens, setAllergens] = useState('');
  const [packagingInfo, setPackagingInfo] = useState('');

  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [approxAreaLabel, setApproxAreaLabel] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ack, setAck] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ack) {
      setError('Please confirm the food-safety acknowledgement before posting.');
      return;
    }
    setLoading(true);

    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foodName,
        dietType,
        servings: Number(servings),
        approxQuantity,
        description,
        preparedAt: new Date(preparedAt).toISOString(),
        collectionDeadline: new Date(collectionDeadline).toISOString(),
        storageCondition,
        wasRefrigerated,
        allergens,
        packagingInfo,
        address: { line1, city, approxAreaLabel: approxAreaLabel || `Near ${city}`, country: 'India' },
        pickupInstructions,
        contactPhone,
        isAnonymous,
        foodSafetyAcknowledged: true
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not create donation.');
      return;
    }
    router.push(`/donor/donations/${data.donation.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Post surplus food</h1>
      <p className="text-black/50 mb-6">Takes about two minutes. Your exact address is never shown publicly.</p>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Food name</label>
            <input required className="input" value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Vegetable biryani" />
          </div>
          <div>
            <label className="label">Diet type</label>
            <select className="input" value={dietType} onChange={(e) => setDietType(e.target.value)}>
              <option value="VEG">Vegetarian</option>
              <option value="NON_VEG">Non-vegetarian</option>
              <option value="VEGAN">Vegan</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Number of servings</label>
            <input type="number" min={1} required className="input" value={servings} onChange={(e) => setServings(Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="label">Approximate quantity (optional)</label>
            <input className="input" value={approxQuantity} onChange={(e) => setApproxQuantity(e.target.value)} placeholder="e.g. approx 12 kg" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-black/10 pt-4">
          <p className="font-semibold text-sm mb-3">Food safety details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prepared at</label>
              <input type="datetime-local" required className="input" value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)} />
            </div>
            <div>
              <label className="label">Collection deadline</label>
              <input type="datetime-local" required className="input" value={collectionDeadline} onChange={(e) => setCollectionDeadline(e.target.value)} />
            </div>
            <div>
              <label className="label">Storage condition</label>
              <select className="input" value={storageCondition} onChange={(e) => setStorageCondition(e.target.value)}>
                <option value="ROOM_TEMPERATURE">Room temperature</option>
                <option value="REFRIGERATED">Refrigerated</option>
                <option value="FROZEN">Frozen</option>
                <option value="HOT_HELD">Hot-held</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={wasRefrigerated} onChange={(e) => setWasRefrigerated(e.target.checked)} />
                Food has been refrigerated
              </label>
            </div>
            <div className="col-span-2">
              <label className="label">Known allergens (optional)</label>
              <input className="input" value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="e.g. nuts, dairy" />
            </div>
            <div className="col-span-2">
              <label className="label">Packaging information (optional)</label>
              <input className="input" value={packagingInfo} onChange={(e) => setPackagingInfo(e.target.value)} placeholder="e.g. sealed containers, disposable plates included" />
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 pt-4">
          <p className="font-semibold text-sm mb-3">Pickup</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Exact pickup address (kept private — never shown publicly)</label>
              <input required className="input" value={line1} onChange={(e) => setLine1(e.target.value)} />
            </div>
            <div>
              <label className="label">City</label>
              <input required className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="label">Approximate area (shown publicly)</label>
              <input className="input" value={approxAreaLabel} onChange={(e) => setApproxAreaLabel(e.target.value)} placeholder="e.g. Near MG Road" />
            </div>
            <div className="col-span-2">
              <label className="label">Pickup instructions (optional)</label>
              <input className="input" value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Contact phone</label>
              <input required className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Donate anonymously
        </label>

        <label className="flex items-start gap-2 text-sm bg-amber-50 rounded-lg p-3">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
          <span>
            I confirm this food was prepared and stored safely and I have provided accurate
            information above. I understand Annasethu does not guarantee food safety and that I am
            responsible for following applicable local food-safety rules.
          </span>
        </label>

        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Posting…' : 'Post donation'}</button>
      </form>
    </div>
  );
}
