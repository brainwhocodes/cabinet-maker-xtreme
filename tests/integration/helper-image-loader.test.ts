import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAssemblyHelperImages } from '@/domain/assembly/helper-image-loader';
import { HELPER_ASSET_URL_BY_POSE } from '@/domain/assembly/helper-pose';

const PNG_BYTES = new Uint8Array([137, 80, 78, 71]);

function pngResponse(): Response {
  return new Response(PNG_BYTES.slice().buffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

function installDecodeMock() {
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ close })),
  );
  return close;
}

function installSuccessfulFileReader() {
  class SuccessfulFileReader extends EventTarget {
    result: string | ArrayBuffer | null = 'data:image/png;base64,iVBORw0KGgo=';
    error: DOMException | null = null;
    readAsDataURL() {
      this.dispatchEvent(new Event('load'));
    }
  }
  vi.stubGlobal('FileReader', SuccessfulFileReader);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('assembly helper image loader', () => {
  it('loads every valid PNG after fetch, decode, and data URL validation', async () => {
    const close = installDecodeMock();
    installSuccessfulFileReader();
    const fetchMock = vi.fn(async () => pngResponse());
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await loadAssemblyHelperImages();
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(createImageBitmap).toHaveBeenCalledTimes(6);
    expect(close).toHaveBeenCalledTimes(6);

    expect(Object.keys(loaded)).toHaveLength(6);
    expect(
      Object.values(loaded).every((value) => value?.startsWith('data:image/png;base64,')),
    ).toBe(true);
  });

  it('keeps successful poses when other responses are non-OK, wrong MIME, or rejected', async () => {
    installDecodeMock();
    installSuccessfulFileReader();
    const nonOkUrl = HELPER_ASSET_URL_BY_POSE.measuring;
    const wrongMimeUrl = HELPER_ASSET_URL_BY_POSE.drill_safety;
    const rejectedUrl = HELPER_ASSET_URL_BY_POSE.check_square;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === nonOkUrl) return new Response(null, { status: 404 });
        if (url === wrongMimeUrl) {
          return new Response('not a png', {
            status: 200,
            headers: { 'Content-Type': 'image/jpeg' },
          });
        }
        if (url === rejectedUrl) throw new Error('network unavailable');
        return pngResponse();
      }),
    );

    const loaded = await loadAssemblyHelperImages();

    expect(loaded.measuring).toBeUndefined();
    expect(loaded.drill_safety).toBeUndefined();
    expect(loaded.check_square).toBeUndefined();
    expect(loaded.pointing_guide).toMatch(/^data:image\/png;base64,/);
    expect(loaded.two_person_lift).toMatch(/^data:image\/png;base64,/);
    expect(loaded.completion_check).toMatch(/^data:image\/png;base64,/);
  });

  it('omits only a pose whose bitmap decode rejects', async () => {
    installSuccessfulFileReader();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => pngResponse()),
    );
    const decode = vi.fn(async () => {
      if (decode.mock.calls.length === 1) throw new Error('decode failed');
      return { close: vi.fn() };
    });
    vi.stubGlobal('createImageBitmap', decode);

    const loaded = await loadAssemblyHelperImages();

    expect(Object.keys(loaded)).toHaveLength(5);
  });

  it('returns an empty partial when FileReader fails', async () => {
    installDecodeMock();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => pngResponse()),
    );
    class FailingFileReader extends EventTarget {
      result: string | ArrayBuffer | null = null;
      error = new DOMException('read failed');
      readAsDataURL() {
        this.dispatchEvent(new Event('error'));
      }
    }
    vi.stubGlobal('FileReader', FailingFileReader);

    expect(await loadAssemblyHelperImages()).toEqual({});
  });

  it('omits malformed non-PNG data URL results', async () => {
    installDecodeMock();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => pngResponse()),
    );
    class MalformedFileReader extends EventTarget {
      result: string | ArrayBuffer | null = 'data:image/jpeg;base64,AAAA';
      error: DOMException | null = null;
      readAsDataURL() {
        this.dispatchEvent(new Event('load'));
      }
    }
    vi.stubGlobal('FileReader', MalformedFileReader);

    expect(await loadAssemblyHelperImages()).toEqual({});
  });

  it('returns an empty partial without browser image APIs', async () => {
    vi.stubGlobal('window', undefined);
    expect(await loadAssemblyHelperImages()).toEqual({});
  });
});
