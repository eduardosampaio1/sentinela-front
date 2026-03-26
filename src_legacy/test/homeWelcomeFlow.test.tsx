import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeWelcomePage from "@/pages/HomeWelcomePage";

const hasUserAnalysisRunsMock = vi.fn();

let authState: Record<string, unknown> = {};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/analysisRuns", () => ({
  hasUserAnalysisRuns: (...args: unknown[]) => hasUserAnalysisRunsMock(...args),
}));

describe("home welcome first-access flow", () => {
  beforeEach(() => {
    hasUserAnalysisRunsMock.mockReset().mockResolvedValue(false);
    authState = {
      user: { id: "u-1", email: "first@user.com" },
      signOut: vi.fn(),
    };
  });

  it("shows only first-access decision actions", async () => {
    render(
      <MemoryRouter initialEntries={["/home/welcome"]}>
        <Routes>
          <Route path="/home/welcome" element={<HomeWelcomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(hasUserAnalysisRunsMock).toHaveBeenCalled());

    expect(
      screen.getByText("Your first analysis: Quick Scan or Deep Analysis?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quick Scan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deep Analysis" })).toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
    expect(screen.queryByText("Environment")).not.toBeInTheDocument();
  });
});
