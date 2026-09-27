import crypto from 'crypto';

// 6-digit numeric OTP, generated per delivery for pickup and drop-off
// verification (business rule: a delivery partner only gets pickup details
// after assignment, and the donor/org confirm hand-off with a code rather
// than the platform just trusting a button press).
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}
