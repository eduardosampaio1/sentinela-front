import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicExperienceConfigProvider } from "./PublicExperienceContext";
import { usePublicExperience } from "./usePublicExperience";
import { PublicExperienceHeader } from "./components/PublicExperienceHeader";
import { ExperienceCTA } from "./components/ExperienceCTA";

function CopyProbe() {
  const { locale, variant, copy } = usePublicExperience();
  return <p>{locale}|{variant}|{copy.headline}</p>;
}

describe("PublicExperienceConfigProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the permanent experience product-led and exposes sign in", () => {
    Object.defineProperty(window.navigator, "language", { configurable: true, value: "en-US" });
    render(
      <PublicExperienceConfigProvider variant="official">
        <PublicExperienceHeader />
        <ExperienceCTA />
      </PublicExperienceConfigProvider>,
    );

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Start an analysis" })).toHaveAttribute("href", "/register");
    expect(screen.queryByText(/Lisbon/i)).not.toBeInTheDocument();
  });

  it("switches all public copy to PT-BR and persists the choice", async () => {
    Object.defineProperty(window.navigator, "language", { configurable: true, value: "en-US" });
    render(
      <PublicExperienceConfigProvider variant="official">
        <PublicExperienceHeader />
        <CopyProbe />
      </PublicExperienceConfigProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Mudar para português" }));

    expect(screen.getByText("pt-BR|official|A IA não deveria responder tudo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(window.localStorage.getItem("sentinela.public.locale")).toBe("pt-BR");
  });
});
