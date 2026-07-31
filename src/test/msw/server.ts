// Servidor MSW para os testes da jornada canônica (msw/node). NÃO é global: cada suíte que precisa
// chama `setupMsw()` no topo. Assim o MSW não intercepta as suítes legadas. Em produção o MSW nunca
// é montado (só em test/dev controlado).

import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

/** Liga o MSW p/ a suíte atual: erra em request não-tratada (pega chamada fora do contrato). */
export function setupMsw(): void {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
