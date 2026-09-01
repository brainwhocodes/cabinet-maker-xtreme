import '@testing-library/jest-dom';

// Mock WebMCP document.modelContext if not available in jsdom
if (typeof window !== 'undefined') {
  if (!('modelContext' in document)) {
    const tools = new Map();
    (document as unknown as { modelContext: unknown }).modelContext = {
      registerTool: async (tool: { name: string }) => {
        tools.set(tool.name, tool);
      },
      unregisterTool: async (name: string) => {
        tools.delete(name);
      },
      getTools: async () => Array.from(tools.values()),
      executeTool: async (
        tool: { name: string; execute?: (args: unknown) => Promise<unknown> },
        argsStr: string,
      ) => {
        const parsed = JSON.parse(argsStr);
        if (tool.execute) {
          return await tool.execute(parsed);
        }
        return null;
      },
    };
  }
}
