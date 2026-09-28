export default function FoodSafetyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-14 prose prose-sm">
      <h1 className="text-3xl font-bold mb-4 not-prose">Food safety guidance</h1>
      <p className="text-black/70">
        Annadharaa helps connect surplus food with organizations that can use it, but the platform
        does not inspect, test, or certify any food listed on it. Posting a donation on Annadharaa is
        not a guarantee that the food is safe to eat.
      </p>
      <h2 className="font-semibold text-lg mt-6 mb-2">For donors</h2>
      <ul className="list-disc pl-5 text-black/70 space-y-1">
        <li>Only donate food that has been prepared, stored, and handled safely.</li>
        <li>Provide accurate preparation time, storage condition, and known allergens.</li>
        <li>Set a realistic collection deadline that reflects how long the food remains safe.</li>
        <li>Follow all applicable local food-safety and public-health regulations.</li>
      </ul>
      <h2 className="font-semibold text-lg mt-6 mb-2">For organizations</h2>
      <ul className="list-disc pl-5 text-black/70 space-y-1">
        <li>Inspect food on receipt before serving it.</li>
        <li>Do not serve food that appears spoiled, mishandled, or past a safe window.</li>
        <li>Report any food-safety concerns through the platform immediately.</li>
      </ul>
      <p className="text-black/70 mt-6">
        Annadharaa is not liable for the condition of donated food. Final food-safety policies must
        be reviewed and adapted to the laws of the country/city where the platform operates before
        production use.
      </p>
    </div>
  );
}
