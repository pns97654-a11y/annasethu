// Storage abstraction for donation photos and organization documents.
// Local dev falls back to a data-URL passthrough so the app is fully
// runnable with zero cloud setup. Set STORAGE_PROVIDER=s3|gcs and implement
// the corresponding branch before going to production — don't store large
// binaries in Postgres.

export async function storeImage(dataUrl: string, _keyHint: string): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER ?? 'local';
  if (provider === 'local') {
    // In local/dev mode we just persist the data URL itself as the "url".
    // This keeps the MVP runnable without any cloud credentials. It is not
    // suitable for production traffic volumes.
    return dataUrl;
  }
  throw new Error(`Storage provider "${provider}" adapter not yet implemented.`);
}
