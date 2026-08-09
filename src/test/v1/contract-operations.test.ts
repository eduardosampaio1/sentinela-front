// WS-A2 + A3 + A7 — o gate compara OPERAÇÕES, não só campos.
//
// O gate antigo respondia "o read-model mudou?". Não respondia "existe operação pública que o
// frontend nem sabe que existe?". Quatro operações contratadas ficaram sem cliente com a suíte
// verde, porque nada olhava a lista de operações.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { explicarResolucao, resolverOrigemDoContrato } from "./contractOrigin";
import {
  compararOperacoes,
  operacoesDoCliente,
  operacoesDoContrato,
  tiposDeclarados,
} from "./operationInventory";
import { SEM_CLIENTE_NO_FRONT, SEM_ENTRADA_NO_CONTRATO } from "./divergenciaDeclarada";

const RAIZ = resolve(__dirname, "../../..");
const CLIENTE = resolve(RAIZ, "src/lib/v1/client.ts");
const COPIA = resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts");

const resolucao = resolverOrigemDoContrato();
const temOrigem = resolucao.escolhida !== null;

function inventario() {
  const doc = JSON.parse(
    readFileSync(resolve(resolucao.escolhida!.caminho, "public-v1.json"), "utf-8"),
  );
  const contrato = operacoesDoContrato(doc);
  const cliente = operacoesDoCliente(readFileSync(CLIENTE, "utf-8"));
  const tipos = tiposDeclarados(readFileSync(COPIA, "utf-8"));
  return { doc, contrato, cliente, diff: compararOperacoes(contrato, cliente, tipos) };
}

describe("WS-A2 · inventário normalizado de operações", () => {
  it.runIf(temOrigem)("o contrato declara operações extraíveis e determinísticas", () => {
    const { contrato } = inventario();
    expect(contrato.length, explicarResolucao(resolucao)).toBeGreaterThan(0);
    // Ordenação determinística: sem isso, o diff muda de ordem entre máquinas e o gate vira
    // ruído que as pessoas aprendem a ignorar.
    expect(contrato.map((o) => o.chave)).toEqual([...contrato.map((o) => o.chave)].sort());
    // Toda operação precisa ter identidade própria — `operationId` é o que permite detectar
    // `path_mismatch` (mesma operação, caminho trocado) em vez de ver um missing + um extra.
    for (const o of contrato) {
      expect(o.operationId, `operação sem operationId: ${o.chave}`).toBeTruthy();
    }
  });

  it.runIf(temOrigem)("o cliente do frontend expõe operações extraíveis", () => {
    const { cliente } = inventario();
    expect(cliente.length, "nenhuma chamada reconhecida em client.ts").toBeGreaterThan(0);
    for (const o of cliente) {
      expect(o.projecao, `chamada sem tipo de resposta: ${o.chave}`).toBeTruthy();
    }
  });

  it.runIf(temOrigem)("nenhuma operação com cliente usa projeção que a cópia não declara", () => {
    const { diff } = inventario();
    expect(diff.projection_mismatch).toEqual([]);
  });

  it.runIf(temOrigem)("método e caminho batem para toda operação que existe dos dois lados", () => {
    const { diff } = inventario();
    expect(diff.method_mismatch).toEqual([]);
    expect(diff.path_mismatch).toEqual([]);
  });

  it.runIf(temOrigem)("a divergência real é EXATAMENTE a divergência declarada", () => {
    // O caso central. Um item novo em qualquer das duas listas fica vermelho; um item resolvido
    // também — a lista precisa encolher junto com a dívida, senão vira folclore.
    const { diff } = inventario();
    expect(diff.missing_in_front, "B1 mudou: operação contratada entrou/saiu do estado sem cliente").toEqual(
      [...SEM_CLIENTE_NO_FRONT].sort(),
    );
    expect(diff.extra_in_front, "C2 mudou: o cliente chama operação fora de `operations[]`").toEqual(
      [...SEM_ENTRADA_NO_CONTRATO].sort(),
    );
  });

  it.runIf(temOrigem)("o inventário responde objetivamente quantas e quais", () => {
    // A pergunta que o "11 × 6" não respondia. Aqui os quatro números têm nome e somam.
    const { contrato, cliente, diff } = inventario();
    const comCliente = contrato.length - diff.missing_in_front.length;
    expect(contrato.length).toBe(comCliente + diff.missing_in_front.length);
    expect(cliente.length).toBe(comCliente + diff.extra_in_front.length);
    expect(comCliente).toBeGreaterThan(0);
  });
});

describe("WS-A3 · C2 — /v1/me", () => {
  it.runIf(temOrigem)("o contrato CONGELA o read-model de /v1/me", () => {
    // Prova de que `/v1/me` é operação pública real e não conveniência do frontend: o manifesto
    // congela a superfície inteira dela.
    const { doc } = inventario();
    expect(doc.me_read_model_fields).toEqual(["user", "workspaces", "capabilities"]);
    expect(doc.me_user_fields).toEqual(["id", "email", "name"]);
    expect(doc.me_workspace_fields).toEqual(["id", "name", "role"]);
    expect(doc.me_capabilities).toEqual(["canonical_analysis_enabled"]);
    expect(String(doc.me_nota)).toContain("/v1/me");
  });

  it.runIf(temOrigem)("a cópia TS reproduz o read-model congelado de /v1/me", () => {
    const { doc } = inventario();
    const texto = readFileSync(COPIA, "utf-8");
    for (const campo of [
      ...(doc.me_read_model_fields as string[]),
      ...(doc.me_user_fields as string[]),
      ...(doc.me_workspace_fields as string[]),
    ]) {
      expect(texto, `MeView não declara \`${campo}\``).toMatch(
        new RegExp(`(^|[^A-Za-z0-9_$])${campo}\\??\\s*:`, "m"),
      );
    }
  });

  it.runIf(temOrigem)("`operations[]` está INCOMPLETO — e isso é defeito declarado, não semântica", () => {
    // A conclusão do A3: se `operations[]` representasse só a família `analyses`, o manifesto não
    // congelaria quatro grupos de campos de `/v1/me` nem diria que ela é a única autoridade de
    // membership. Ele congela. Logo a lista é que está incompleta.
    //
    // O patch é no repo do contrato, que está CONGELADO — por isso a dívida fica declarada aqui
    // e o patch exato vai no documento, não no arquivo.
    const { contrato } = inventario();
    expect(contrato.some((o) => o.caminho === "/v1/me")).toBe(false);
  });
});

describe("WS-A7 · B1 — os quatro clientes faltantes", () => {
  it.runIf(temOrigem)("são delta de FRONT sobre contrato REAL, não delta de backend", () => {
    // Cada uma existe no contrato canônico com método, caminho e operationId. Nada precisa ser
    // criado no backend: falta cliente e tipo neste repositório.
    const { contrato, diff } = inventario();
    for (const chave of SEM_CLIENTE_NO_FRONT) {
      const op = contrato.find((o) => o.chave === chave);
      expect(op, `${chave} não está no contrato — não seria delta de front`).toBeTruthy();
      expect(op!.operationId, `${chave} sem operationId`).toBeTruthy();
    }
    expect(diff.missing_in_front.length).toBe(SEM_CLIENTE_NO_FRONT.length);
  });
});
