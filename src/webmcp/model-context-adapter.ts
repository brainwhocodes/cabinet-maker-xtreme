'use client';

import { useEffect, useRef } from 'react';
import { getWebMCPTools } from './register-tools';

interface ModelContextBrowserAPI {
  registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => Promise<void> | void;
}

/**
 * Registers all WebMCP tools on `document.modelContext` with AbortController lifecycle cleanup.
 */
export function useWebMCPRegistration() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const doc = document as unknown as { modelContext?: ModelContextBrowserAPI };
    const modelContext = doc.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const tools = getWebMCPTools();

    for (const tool of tools) {
      try {
        const registrationResult = modelContext.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
            execute: async (input: Record<string, unknown>) => {
              return await tool.execute(input);
            },
          },
          { signal: controller.signal },
        );

        if (
          registrationResult &&
          typeof (registrationResult as Promise<void>).catch === 'function'
        ) {
          (registrationResult as Promise<void>).catch((err: unknown) => {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.warn(`WebMCP tool registration notice for ${tool.name}:`, err);
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') continue;
        console.warn(`Failed to register WebMCP tool: ${tool.name}`, err);
      }
    }

    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort(
            new DOMException('WebMCP tools unregistered on unmount', 'AbortError'),
          );
        } catch {
          // Ignore already-aborted signal exceptions during unmount
        }
        abortControllerRef.current = null;
      }
    };
  }, []);
}
