// Payments abstraction — architecture only. The MVP never fabricates a
// successful transaction. Sponsorship rows are created with status
// "PENDING" and only a real provider webhook (Stripe/Razorpay) should ever
// move a Transaction to "SUCCEEDED". Until PAYMENTS_PROVIDER is configured,
// `charge()` deliberately throws rather than pretending to succeed.

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  sponsorshipId: string;
}

export interface ChargeResult {
  providerRef: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
}

export async function charge(_req: ChargeRequest): Promise<ChargeResult> {
  const provider = process.env.PAYMENTS_PROVIDER ?? 'none';
  if (provider === 'none') {
    throw new Error(
      'No payment provider configured. Set PAYMENTS_PROVIDER=stripe|razorpay and implement ' +
        'the corresponding adapter before accepting real sponsor funds.'
    );
  }
  // Phase 2/3: implement Stripe/Razorpay adapters here, and record the
  // result via a Transaction row created from the provider's webhook
  // callback (not from the client-facing request) so status can't be spoofed.
  throw new Error(`Payment provider "${provider}" adapter not yet implemented.`);
}
