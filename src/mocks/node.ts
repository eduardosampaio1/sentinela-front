// M16 — o lado NODE do mock.
//
// ## Fachada, não segunda implementação
//
// O servidor `msw/node` já existe em `src/test/msw/server.ts` e tem 18 consumidores. Reescrevê-lo
// aqui produziria dois servidores com os mesmos handlers e políticas que divergem no primeiro dia
// em que alguém tocar num dos dois — exatamente o "universo paralelo" que a Fase 2 existe para
// impedir, e o motivo de a M15 esperar a M16 em vez de o Storybook inventar as próprias fixtures.
//
// Então este arquivo **aponta** para a fonte única. O plano pede `src/mocks/node.ts`; ele existe,
// e o que ele publica é o endereço canônico, não uma cópia.
//
// Migrar os 18 importadores de `@/test/msw/server` para cá seria migração em massa, fora do
// escopo da M16 (que é *MSW no browser*). Fica registrado como dívida de arrumação.
//
// ## A assimetria com o browser é deliberada
//
// Aqui `onUnhandledRequest` é `"error"`: numa suíte, uma requisição fora do contrato **precisa**
// derrubar o teste — é assim que se descobre que o código chamou um endereço que ninguém
// contratou. No browser é `"bypass"`, porque lá o mesmo rigor derrubaria o HMR do Vite.

export { server, setupMsw } from "@/test/msw/server";
export { handlers, MSW_BASE } from "@/test/msw/handlers";
