"use client";

import { UnsupportedModePage } from "@/components/unsupported-mode-page";

/**
 * `elder_care` encoded US assisted-living law. RU v1 retired the preset (see
 * DEPRECATED_INDUSTRIES in lib/industry.ts) and the backend now answers it with a typed
 * "режим не поддерживается" result, so the old upload flow could only ever fail.
 */
export default function ElderCarePage() {
  return <UnsupportedModePage />;
}
