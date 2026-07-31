import { render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { CanonicalQueryProvider, createCanonicalQueryClient } from "@/lib/v1";

function Sonda({ onClient }: { onClient: (c: unknown) => void }) {
  onClient(useQueryClient());
  return null;
}

describe("CanonicalQueryProvider (fundação, não montado no app vivo)", () => {
  it("fornece um QueryClient canônico (staleTime da fundação = 30s)", () => {
    let capturado: unknown;
    render(
      <CanonicalQueryProvider>
        <Sonda onClient={(c) => (capturado = c)} />
      </CanonicalQueryProvider>,
    );
    expect(capturado).toBeTruthy();
    const qc = capturado as ReturnType<typeof createCanonicalQueryClient>;
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it("usa o cliente injetado quando fornecido", () => {
    const client = createCanonicalQueryClient();
    let capturado: unknown;
    render(
      <CanonicalQueryProvider client={client}>
        <Sonda onClient={(c) => (capturado = c)} />
      </CanonicalQueryProvider>,
    );
    expect(capturado).toBe(client);
  });
});
