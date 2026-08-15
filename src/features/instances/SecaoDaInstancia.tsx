// M42 · CFG-04 — consultar e alterar o nome da Instância.
//
// ## Por que ela mora AQUI, e não na página de Configurações
//
// Renomear uma Instância exige saber QUAL Instância. A página de Configurações da conta não tem
// esse contexto, e criar um seletor de Instância só para ela teria dois defeitos: inventaria uma
// superfície que o Blueprint não prevê, e faria a pessoa escolher duas vezes — uma para navegar,
// outra para configurar.
//
// A Instância já tem endereço próprio, e é dele que vem a identidade (`useParams`, a mesma que
// carregou a tela). Compor as duas configurações numa experiência não obriga a empilhá-las na
// mesma rota: obriga a que cada uma esteja onde seu contexto existe.
//
// ## O que o rename NÃO toca
//
// `instance_id`, `created_at` e o ponteiro de **baseline**. O contrato lista os quatro em
// `nao_toca`, e o cache reflete isso: a mutação reescreve a Instância e o item da listagem, e não
// encosta na chave da régua. Invalidar por precaução faria o seletor de baseline recarregar como
// se renomear tivesse mexido nele.
//
// ## Nome duplicado é sucesso
//
// Não existe unicidade — o contrato declara a ausência em letras claras. Esta seção não bloqueia,
// não avisa "já existe", não sugere sufixo e não renomeia para "Suporte (2)". Se o produtor
// aceita, o produto aceita.

import { useState } from "react";
import type { CanonicalScope } from "@/lib/v1";
import { useLanguage } from "@/contexts/LanguageContext";
import { CampoDeNome } from "@/shared/config/CampoDeNome";
import { useRenomearInstancia } from "./data/instance";

export function SecaoDaInstancia({
  scope,
  instanceId,
  instanceName,
}: {
  scope: CanonicalScope | null;
  instanceId: string | undefined;
  /** O nome CONFIRMADO, vindo de `useInstance` na página. A seção não busca de novo: a página já
   *  tem a leitura autoritativa, e uma segunda query criaria duas verdades sobre a mesma linha. */
  instanceName: string;
}) {
  const { t } = useLanguage();
  const renomear = useRenomearInstancia();
  const [confirmadoAgora, setConfirmadoAgora] = useState(false);

  if (!scope || !instanceId) return null;

  // O CONFIRMADO é a última resposta do produtor, quando houve uma. A prop vem da leitura da
  // página e reconcilia pelo cache, mas depende de a página re-renderizar; a resposta do `PATCH`
  // é a linha persistida e já está aqui. Preferi-la torna a seção correta por si mesma, em vez
  // de correta por consequência de outro componente.
  const confirmado = renomear.data?.name ?? instanceName;

  return (
    <section aria-labelledby="inst-config" className="mt-8 space-y-3">
      <h2 id="inst-config" className="text-lg font-medium text-foreground">
        {t("instanceConfig.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("instanceConfig.body")}</p>

      {/* Identidade antes do campo, pela mesma razão da seção do espaço. */}
      <p className="text-xs text-muted-foreground">
        {t("instanceConfig.identity")}: <code>{instanceId}</code>
      </p>
      <CampoDeNome
        confirmado={confirmado}
        rotulo={t("instanceConfig.nameLabel")}
        acao={t("instanceConfig.save")}
        salvando={renomear.isPending}
        falhou={renomear.isError}
        confirmadoAgora={confirmadoAgora}
        textos={{
          salvando: t("instanceConfig.saving"),
          salvo: t("instanceConfig.saved"),
          falhou: t("instanceConfig.saveFailed"),
          vazio: t("instanceConfig.nameRequired"),
        }}
        onSalvar={async (nome) => {
          setConfirmadoAgora(false);
          await renomear.mutateAsync({ scope, instanceId, name: nome }).then(
            () => setConfirmadoAgora(true),
            () => setConfirmadoAgora(false),
          );
        }}
      />

    </section>
  );
}
