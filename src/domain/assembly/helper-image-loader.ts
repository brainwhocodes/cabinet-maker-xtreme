import { HELPER_ASSET_URL_BY_POSE, type HelperPose } from '@/domain/assembly/helper-pose';

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
    } else {
      reject(new Error('Helper image did not produce a data URL'));
    }
  });
  reader.addEventListener('error', () => reject(reader.error ?? new Error('FileReader failed')));
  reader.addEventListener('abort', () => reject(new Error('FileReader was aborted')));
  reader.readAsDataURL(blob);
  return promise;
}

async function loadHelperImage(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('image/png')) {
      return undefined;
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    bitmap.close();
    const dataUrl = await readBlobAsDataUrl(blob);
    return dataUrl.startsWith('data:image/png;base64,') ? dataUrl : undefined;
  } catch {
    return undefined;
  }
}

export async function loadAssemblyHelperImages(): Promise<Partial<Record<HelperPose, string>>> {
  if (
    typeof window === 'undefined' ||
    typeof fetch !== 'function' ||
    typeof FileReader === 'undefined' ||
    typeof createImageBitmap !== 'function'
  ) {
    return {};
  }

  const entries = Object.entries(HELPER_ASSET_URL_BY_POSE) as Array<[HelperPose, string]>;
  const loaded = await Promise.all(
    entries.map(async ([pose, url]) => [pose, await loadHelperImage(url)] as const),
  );
  const helperImageByPose: Partial<Record<HelperPose, string>> = {};
  for (const [pose, dataUrl] of loaded) {
    if (dataUrl) {
      helperImageByPose[pose] = dataUrl;
    }
  }
  return helperImageByPose;
}
