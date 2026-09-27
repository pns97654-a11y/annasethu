import { db } from './db';

// Notification abstraction. Today this only writes an IN_APP row so the
// dashboards have something real to show. Phase 2 wires EMAIL_PROVIDER /
// SMS_PROVIDER (see .env.example) into the `send` function below without
// touching any call site — every place in the app that wants to notify a
// user calls `notify(...)`, never a provider SDK directly.

export type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  relatedType?: 'DONATION' | 'REQUEST' | 'DELIVERY' | 'ORGANIZATION' | 'SYSTEM';
  relatedId?: string;
};

export async function notify(input: NotificationInput) {
  // Always record in-app so the notification center has history, regardless
  // of whether external channels are configured.
  await db.notification.create({
    data: {
      userId: input.userId,
      channel: 'IN_APP',
      title: input.title,
      body: input.body,
      relatedType: input.relatedType,
      relatedId: input.relatedId
    }
  });

  // Phase 2: respect per-user notification preferences (not yet a model in
  // the MVP schema — add a NotificationPreference table) and fan out to
  // email/SMS/WhatsApp via the configured provider, e.g.:
  //
  // if (process.env.EMAIL_PROVIDER !== 'none') { await sendEmail(...); }
  // if (process.env.SMS_PROVIDER !== 'none') { await sendSms(...); }
}
