export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-bold mb-4">Privacy policy</h1>
      <p className="text-black/70 mb-4">
        This is a placeholder privacy policy for demo/development purposes. Before launching,
        replace this with a policy reviewed by qualified legal counsel.
      </p>
      <p className="text-black/70">
        Design principle already built into the platform: donor and organization exact addresses
        are never displayed publicly. Only an approximate area and city are shown in listings.
        Exact addresses are revealed only to the address owner, an administrator, or a delivery
        partner after they are assigned to that specific delivery. See <code>lib/access-control.ts</code>{' '}
        in the codebase for the enforcement point.
      </p>
    </div>
  );
}
