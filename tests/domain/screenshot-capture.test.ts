import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureStudioScreenshot,
  registerPlannerCaptureHandle,
} from '@/rendering/screenshots/capture-canvas';

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
  document.body.replaceChildren();
});

describe('planner screenshot capture handle', () => {
  it('captures only the registered planner canvas after one prepared frame', async () => {
    const unrelated = document.createElement('canvas');
    const planner = document.createElement('canvas');
    planner.width = 640;
    planner.height = 360;
    document.body.append(unrelated, planner);
    const toDataUrl = vi.fn(() => 'data:image/png;base64,planner');
    planner.toDataURL = toDataUrl;
    const prepareFrame = vi.fn(async () => {});
    const restoreFrame = vi.fn();
    unregister = registerPlannerCaptureHandle({ canvas: planner, prepareFrame, restoreFrame });

    const result = await captureStudioScreenshot({
      filename: 'planner.png',
      includeTransientPreview: false,
    });
    expect(result).toEqual({
      dataUrl: 'data:image/png;base64,planner',
      width: 640,
      height: 360,
      filename: 'planner.png',
    });
    expect(prepareFrame).toHaveBeenCalledWith(false);
    expect(toDataUrl).toHaveBeenCalledTimes(1);
    expect(restoreFrame).toHaveBeenCalledTimes(1);
  });

  it('returns an explicit error without an active planner renderer', async () => {
    await expect(captureStudioScreenshot()).rejects.toThrow(
      'No active planner renderer is available for screenshot capture.',
    );
  });
});
