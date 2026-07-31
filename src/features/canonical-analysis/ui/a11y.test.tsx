import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { UploadStep } from "./UploadStep";
import { StateBanner } from "./notices";

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>{children}</CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

// color-contrast depende de layout/estilos computados que o jsdom não fornece — desabilitado aqui
// (fica para o axe no browser E2E). O resto (label, aria, roles, button-name) roda no jsdom.
async function semViolacoes(container: HTMLElement) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations;
}

describe("Acessibilidade (axe) — jornada canônica", () => {
  it("UploadStep: dropzone com label/aria, sem violações", async () => {
    const { container } = render(wrap(<UploadStep analysisId="an-abc" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />));
    expect(await semViolacoes(container)).toEqual([]);
  });

  it("StateBanner (running): status/aria-live, sem violações", async () => {
    const { container } = render(wrap(<StateBanner view={statusView("running")} />));
    expect(await semViolacoes(container)).toEqual([]);
  });

  it("StateBanner (failed): sem violações", async () => {
    const { container } = render(wrap(<StateBanner view={statusView("failed", { retry_allowed: true })} />));
    expect(await semViolacoes(container)).toEqual([]);
  });
});
