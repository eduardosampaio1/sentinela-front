import { beforeEach, describe, expect, it, vi } from "vitest";

import { analyzeConversations } from "@/lib/api";

const getSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
  },
}));

describe("api error formatting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSessionMock.mockReset().mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
    signOutMock.mockReset().mockResolvedValue({ error: null });
  });

  it("surfaces a readable backend auth configuration message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            code: "supabase_auth_not_configured",
            message: "Supabase Auth is not configured on the backend.",
          },
        }),
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      analyzeConversations([{ id: "conv-1", messages: [] }], {
        workspaceId: "workspace-1",
        projectId: "project-1",
        environmentId: "environment-1",
      }),
    ).rejects.toThrow("HTTP 500: Analysis backend authentication is not configured.");
  });
});
