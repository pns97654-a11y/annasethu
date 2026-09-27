'use client';

import { useEffect, useState } from 'react';

export default function ImpactPage() {
  const [impact, setImpact] = useState<any>(null);

  useEffect(() => {
    fetch('/api/impact').then((r) => r.json()).then(setImpact);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-bold mb-2">Platform impact</h1>
      <p className="text-black/50 mb-8">
        Every figure below is a live count from completed deliveries — never a placeholder.
      </p>

      {!impact ? (
        <p className="text-black/40">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
            <Stat icon="🍛" label="Meals rescued" value={impact.mealsRescued} />
            <Stat icon="🚚" label="Deliveries completed" value={impact.deliveriesCompleted} />
            <Stat icon="🤝" label="Verified organizations" value={impact.verifiedOrganizations} />
            <Stat icon="👨‍🍳" label="Food donors" value={impact.foodDonors} />
            <Stat icon="📍" label="Cities covered" value={impact.citiesCovered} />
          </div>
          <div className="card p-5">
            <p className="text-sm text-black/60">
              <strong>Estimated CO₂e avoided:</strong> {(impact.estimatedCo2KgAvoided ?? 0).toLocaleString()} kg.
              This is an estimate, not a measurement. Methodology: each rescued meal is assumed to
              avoid roughly 0.5 kg of CO₂-equivalent emissions associated with food waste sent to
              landfill (production, transport, and methane from decomposition). This coefficient is
              a rough placeholder and should be replaced with a cited, locally-appropriate
              methodology before being used in any public claim.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value?.toLocaleString() ?? "0"}</div>
      <div className="text-xs text-black/50">{label}</div>
    </div>
  );
}
