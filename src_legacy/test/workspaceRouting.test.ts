import { describe, expect, it } from "vitest";
import {
  buildWorkspaceHomePath,
  projectsSlugFromEmail,
  workspaceSlug,
} from "@/lib/workspaceRouting";

describe("workspace routing helpers", () => {
  it("builds projects slug from email local-part", () => {
    expect(projectsSlugFromEmail("teste3@teste.com.br")).toBe("teste3-projects");
  });

  it("prefers workspace name for user-facing slug", () => {
    expect(
      workspaceSlug({
        name: "Support Bot",
        slug: "stl-abc123",
      }),
    ).toBe("support-bot");
  });

  it("builds canonical workspace home path", () => {
    expect(
      buildWorkspaceHomePath({
        email: "teste3@teste.com.br",
        workspace: { name: "Support Bot", slug: "stl-abc123" },
      }),
    ).toBe("/teste3-projects/support-bot");
  });
});
