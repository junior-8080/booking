import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { ApiError } from '@/lib/api-client';
import { API_BASE } from '@/lib/config';
import { getStoredAuth } from '@/lib/storage';

export type UploadCategory = 'logos' | 'proofs' | 'services';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

// Backend multer filter allows these exactly (upload.controller.ts) — a
// narrower picker allowlist would silently break HEIC/HEIF from iPhones.
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    default: return 'image/jpeg';
  }
}

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  const mimeType = asset.mimeType ?? guessMimeType(asset.uri);
  return {
    uri: asset.uri,
    mimeType,
    fileName: asset.fileName ?? `photo-${Date.now()}.${mimeType.split('/')[1]}`,
  };
}

async function launchLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to choose a photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled || !result.assets[0]) return null;
  return toPickedImage(result.assets[0]);
}

async function launchCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take a photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (result.canceled || !result.assets[0]) return null;
  return toPickedImage(result.assets[0]);
}

// Presents a native choice between camera and library — matches the web
// spec's "camera roll or camera capture" requirement (§6.2).
export function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take Photo', onPress: () => launchCamera().then(resolve) },
      { text: 'Choose from Library', onPress: () => launchLibrary().then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

export async function uploadImage(image: PickedImage, category: UploadCategory): Promise<string> {
  if (!ACCEPTED_MIME_TYPES.has(image.mimeType)) {
    throw new Error(`Image type "${image.mimeType}" isn't supported. Use JPEG, PNG, WebP, GIF, or HEIC.`);
  }

  const auth = await getStoredAuth();
  const body = new FormData();
  body.append('file', { uri: image.uri, name: image.fileName, type: image.mimeType } as unknown as Blob);
  body.append('category', category);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: auth ? { Authorization: `Bearer ${auth.token}` } : undefined,
    body,
  });

  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error ?? 'Upload failed', res.status);
  return json.data.url as string;
}
