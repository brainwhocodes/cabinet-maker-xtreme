'use client';

import type React from 'react';
import { useWebMCPRegistration } from '@/webmcp/model-context-adapter';

export function WebMCPClientProvider({ children }: { children: React.ReactNode }) {
  useWebMCPRegistration();
  return <>{children}</>;
}
