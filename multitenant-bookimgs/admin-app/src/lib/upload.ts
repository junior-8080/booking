export type UploadCategory = 'logos' | 'proofs' | 'services';

export async function uploadToR2(file: File, category: UploadCategory): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body,
  });

  const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Upload failed');
  }

  return json.data!.url;
}
