"use client";

import { UnsupportedModePage } from "@/components/unsupported-mode-page";

/**
 * `medical_bill` encoded US itemized-EOB disputes, which have no counterpart under
 * ОМС/ДМС. RU v1 retired the preset (see DEPRECATED_INDUSTRIES in lib/industry.ts) and the
 * backend now answers it with a typed "режим не поддерживается" result.
 */
export default function MedicalBillPage() {
  return <UnsupportedModePage />;
}
