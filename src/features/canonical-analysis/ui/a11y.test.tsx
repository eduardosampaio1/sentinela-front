import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { ProblemError } from "@/lib/v1";
import { ProblemFeedback } from "./notices";
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

// ═══════════════════════════════════════════════════════════════════════════════════════════
// M45.3 · decisão de owner — anunciar espera só quando algo vem
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// `aria-busy` é o que um leitor de tela ouve como *"esta região está atualizando"*, e o spinner é
// a mesma promessa para quem enxerga. Com o documento levado pela retenção, nada vem.
//
// As DUAS direções, e a segunda é a que importa: o padrão do componente não pode ter mudado. Sem
// ela, apagar o anúncio de espera de todo o produto passaria — e `capacity_wait`, que é espera de
// verdade, ficaria mudo. Esta é a contraprova que uma tentativa anterior fez em e2e sobre RES-01,
// onde ela é INALCANÇÁVEL: aquela página só busca o documento quando a análise já terminou.
describe("M45.3 · ProblemFeedback anuncia espera só quando ela existe", () => {
  const problema = () =>
    new ProblemError({
      type: "urn:sentinela:error:result_not_available",
      title: "result_not_available",
      status: 404,
      code: "result_not_available",
      detail: "result_not_available",
      instance: "corr-1",
      retryable: false,
    });

  it("por padrão, a espera CONTINUA sendo anunciada", () => {
    const { container } = render(wrap(<ProblemFeedback error={problema()} />));
    expect(
      container.querySelector('[aria-busy="true"]'),
      "o anúncio de espera sumiu de quem não declarou nada",
    ).not.toBeNull();
  });

  it("com `aguardando={false}`, nada é anunciado como em curso", () => {
    const { container } = render(
      wrap(<ProblemFeedback error={problema()} aguardando={false} />),
    );
    expect(
      container.querySelector('[aria-busy="true"]'),
      "a tela anuncia progresso, e nada mais vem",
    ).toBeNull();
    // E o aviso continua na tela: silenciar a espera não pode silenciar a informação.
    expect(container.textContent?.length ?? 0).toBeGreaterThan(10);
  });
});
