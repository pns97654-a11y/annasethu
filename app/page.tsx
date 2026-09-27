'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Impact = {
  mealsRescued: number;
  deliveriesCompleted: number;
  verifiedOrganizations: number;
  foodDonors: number;
  citiesCovered: number;
};

export default function HomePage() {
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    fetch('/api/impact').then((r) => r.json()).then(setImpact);
  }, []);

  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black/90 leading-tight">
            Good Food Shouldn&rsquo;t Become Waste.
          </h1>
          <p className="mt-5 text-lg text-black/60 max-w-xl">
            Have extra food after a party, event, wedding, restaurant service, or family gathering?
            Donate it. We&rsquo;ll help connect it with a verified organization that can use it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/donor/donations/new" className="btn-primary">Donate Food</Link>
            <Link href="/organization/dashboard" className="btn-secondary">Find Food</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-black/50">
            <Link href="/delivery/register" className="hover:underline">Become a Delivery Partner</Link>
            <span>·</span>
            <Link href="/sponsor/register" className="hover:underline">Become a Sponsor</Link>
          </div>
        </div>
        <div className="card p-8">
          <p className="text-sm uppercase tracking-wide text-black/40 font-semibold mb-4">Platform impact, live</p>
          {!impact ? (
            <p className="text-black/40">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <Stat label="Meals rescued" value={impact.mealsRescued} icon="🍛" />
              <Stat label="Deliveries completed" value={impact.deliveriesCompleted} icon="🚚" />
              <Stat label="Verified organizations" value={impact.verifiedOrganizations} icon="🤝" />
              <Stat label="Food donors" value={impact.foodDonors} icon="👨‍🍳" />
            </div>
          )}
          <p className="text-xs text-black/40 mt-6">
            These are live counts from the platform database — not placeholder numbers. A brand-new
            deployment will legitimately show zeros until real donations are completed.
          </p>
        </div>
      </section>

      <section className="bg-white border-y border-black/5 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-10 text-center">How it works</h2>
          <div className="grid md:grid-cols-4 gap-8 text-sm">
            <Step n={1} title="Post surplus food" body="Donors add food details, quantity, and a collection deadline in a few minutes." />
            <Step n={2} title="A verified org requests it" body="Nearby admin-verified organizations see the listing and request servings." />
            <Step n={3} title="A partner delivers it" body="A delivery partner is assigned, verifies pickup and drop-off with a one-time code." />
            <Step n={4} title="Impact is recorded" body="Once confirmed delivered, the rescue is counted in the public impact dashboard." />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-black/60 max-w-2xl mx-auto">
          Food safety matters. Annasethu requires donors to share preparation time, storage
          condition and a collection deadline for every donation, but the platform does not and
          cannot guarantee food safety — all parties are expected to follow applicable local
          food-safety rules. <Link href="/food-safety" className="text-leaf-700 underline">Read our food-safety guidance</Link>.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div>
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-black/90">{(value ?? 0).toLocaleString()}</div>
      <div className="text-xs text-black/50">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="w-8 h-8 rounded-full bg-leaf-600 text-white flex items-center justify-center font-bold mb-3">
        {n}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-black/60">{body}</p>
    </div>
  );
}
