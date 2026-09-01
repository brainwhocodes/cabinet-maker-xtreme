export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  filename: string;
}

export interface ScreenshotOptions {
  filename?: string;
  download?: boolean;
  includeTransientPreview?: boolean;
}

export interface PlannerCaptureHandle {
  canvas: HTMLCanvasElement;
  prepareFrame(includeTransientPreview: boolean): Promise<void>;
  restoreFrame(): void;
}

let activePlannerCaptureHandle: PlannerCaptureHandle | null = null;

export function registerPlannerCaptureHandle(handle: PlannerCaptureHandle): () => void {
  activePlannerCaptureHandle = handle;
  return () => {
    if (activePlannerCaptureHandle === handle) activePlannerCaptureHandle = null;
  };
}

export async function captureStudioScreenshot(
  options?: ScreenshotOptions,
): Promise<ScreenshotResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Screenshot capture is only available in browser environments.');
  }
  const handle = activePlannerCaptureHandle;
  if (!handle?.canvas.isConnected) {
    throw new Error('No active planner renderer is available for screenshot capture.');
  }

  await handle.prepareFrame(options?.includeTransientPreview ?? false);
  let dataUrl: string;
  try {
    dataUrl = handle.canvas.toDataURL('image/png');
  } finally {
    handle.restoreFrame();
  }
  const filename = options?.filename ?? `CabCraft_Design_Snapshot_${Date.now().toString(36)}.png`;

  if (options?.download) {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return {
    dataUrl,
    width: handle.canvas.width,
    height: handle.canvas.height,
    filename,
  };
}
