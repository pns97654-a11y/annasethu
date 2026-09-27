import bcrypt from 'bcryptjs';
import { db } from './db';
import { getSession } from './session';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type Role = 'DONOR' | 'ORGANIZATION' | 'DELIVERY_PARTNER' | 'SPONSOR' | 'ADMIN';

// Loads the full current user (or null) from the session cookie. Use this
// in API routes / server components instead of trusting any client-sent
// user id.
export async function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Throws if there's no logged-in, active user. Call at the top of any
// protected API route.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Not authenticated', 401);
  return user;
}

// Throws if the current user isn't one of the allowed roles. This is the
// single choke point for role-based access control across the API.
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    throw new AuthError('Not authorized for this action', 403);
  }
  return user;
}
