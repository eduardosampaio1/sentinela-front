import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth() }));

const { WorkspaceRequiredRoute } = await import("./WorkspaceRequiredRoute");

function renderGate() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route element={<WorkspaceRequiredRoute />}>
          <Route path="/home" element={<p>tenant-content</p>} />
        </Route>
        <Route path="/workspaces" element={<p>workspace-recovery</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WorkspaceRequiredRoute", () => {
  it("redireciona usuário autenticado sem membership para a recuperação", () => {
    auth.mockReturnValue({ memberships: [], membershipsLoading: false, membershipsError: null, workspace: null });
    renderGate();
    expect(screen.getByText("workspace-recovery")).toBeInTheDocument();
  });

  it("não renderiza dados tenant-scoped durante erro de projeção", () => {
    auth.mockReturnValue({ memberships: [], membershipsLoading: false, membershipsError: new Error("down"), workspace: null });
    renderGate();
    expect(screen.queryByText("tenant-content")).not.toBeInTheDocument();
  });

  it("libera somente a membership projetada e selecionada", () => {
    const workspace = { id: "ws-1", name: "One", role: "owner" };
    auth.mockReturnValue({ memberships: [workspace], membershipsLoading: false, membershipsError: null, workspace });
    renderGate();
    expect(screen.getByText("tenant-content")).toBeInTheDocument();
  });
});
