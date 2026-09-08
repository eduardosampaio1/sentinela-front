import { useContext } from "react";
import { PublicExperienceContext } from "./publicExperienceContextValue";

export function usePublicExperience() {
  const value = useContext(PublicExperienceContext);
  if (!value) throw new Error("usePublicExperience must be used within PublicExperienceConfigProvider");
  return value;
}
