const STEPS = [
  { title: 'Donor posts food', body: 'A donor lists surplus food with quantity, food-safety details, and a collection deadline.' },
  { title: 'Verified organizations are notified', body: 'Admin-verified organizations nearby are notified of the new listing.' },
  { title: 'An organization requests it', body: 'The organization requests some or all of the available servings.' },
  { title: 'The donor confirms the match', body: 'Approving the request creates a delivery job.' },
  { title: 'A delivery partner accepts the job', body: 'Verified delivery partners see open jobs and accept one.' },
  { title: 'Pickup is verified with a code', body: 'The partner and donor confirm hand-off using a one-time pickup code.' },
  { title: 'Food is delivered', body: 'The partner delivers to the organization, who confirms with a drop-off code.' },
  { title: 'Impact is recorded', body: 'The completed delivery counts toward the platform\u2019s public impact statistics.' }
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-bold mb-8">How Annadharaa works</h1>
      <ol className="space-y-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-leaf-600 text-white flex items-center justify-center font-bold text-sm">
              {i + 1}
            </div>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="text-black/60 text-sm">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
