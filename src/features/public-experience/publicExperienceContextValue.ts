import { createContext } from "react";
import type { getPublicExperienceCopy, PublicExperienceLocale, PublicExperienceVariant } from "./content/copy";

export interface PublicExperienceContextValue {
  variant: PublicExperienceVariant;
  locale: PublicExperienceLocale;
  setLocale: (locale: PublicExperienceLocale) => void;
  copy: ReturnType<typeof getPublicExperienceCopy>;
}

export const PublicExperienceContext = createContext<PublicExperienceContextValue | null>(null);
