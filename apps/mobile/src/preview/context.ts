import { createContext } from "react";
import type { BilingualMobileFact } from "@sachmuch/core";
// Only the dedicated offline-preview entry provides this context.
export const PreviewFactsContext = createContext<BilingualMobileFact[] | undefined>(undefined);
