import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "./LegalPage";

export function PrivacyPage() {
  const { language } = useLanguage();
  const pt = language === "pt";

  return (
    <LegalPage
      title={pt ? "Política de Privacidade" : "Privacy Policy"}
      subtitle={pt
        ? "Como coletamos, usamos e protegemos seus dados na plataforma Sentinela."
        : "How we collect, use, and protect your data on the Sentinela platform."}
      updated="April 28, 2025">

      {pt ? <ContentPT /> : <ContentEN />}
    </LegalPage>
  );
}

function ContentPT() {
  return <>
    <h2>1. Quem somos</h2>
    <p>
      O Sentinela é uma plataforma de monitoramento de qualidade de IA desenvolvida e operada pela
      <strong> Baluarte Tecnologia Ltda.</strong>, com sede no Brasil. Ao usar o Sentinela, você
      concorda com as práticas descritas nesta política.
    </p>

    <h2>2. Dados que coletamos</h2>
    <h3>2.1 Dados de conta</h3>
    <p>Quando você cria uma conta, coletamos:</p>
    <ul>
      <li>Nome e endereço de e-mail</li>
      <li>Hash de senha (nunca a senha em texto simples)</li>
      <li>Informações de organização/workspace</li>
      <li>Preferências de idioma e configurações de notificação</li>
    </ul>

    <h3>2.2 Dados de uso da plataforma</h3>
    <p>Para fornecer o serviço de análise, processamos:</p>
    <ul>
      <li>Logs de interações com modelos de IA submetidos via integração</li>
      <li>Configurações de workspaces e guardrails</li>
      <li>Histórico de análises e pontuações geradas pelo AION</li>
      <li>Metadados de execução (timestamps, latências, identificadores de run)</li>
    </ul>

    <h3>2.3 Dados técnicos</h3>
    <ul>
      <li>Endereço IP e informações de dispositivo/navegador</li>
      <li>Logs de acesso para fins de segurança e diagnóstico</li>
      <li>Dados de performance coletados via telemetria anônima</li>
    </ul>

    <div className="callout">
      <p>
        <strong>Importante:</strong> Os logs de IA que você envia ao Sentinela podem conter
        conversas de usuários finais. Você é responsável por garantir que possui a base legal
        adequada para compartilhar esses dados conosco, conforme a LGPD.
      </p>
    </div>

    <h2>3. Como usamos seus dados</h2>
    <ul>
      <li>Executar as análises de qualidade, segurança e custo do AION</li>
      <li>Gerar relatórios, dashboards e alertas no seu workspace</li>
      <li>Autenticar sua sessão e manter a segurança da conta</li>
      <li>Enviar notificações sobre resultados de análise e alertas críticos</li>
      <li>Melhorar os modelos internos de classificação e detecção (dados anonimizados)</li>
      <li>Cumprir obrigações legais e responder a solicitações de autoridades competentes</li>
    </ul>

    <h2>4. Retenção de dados</h2>
    <p>
      Os logs de análise são retidos por <strong>90 dias</strong> por padrão no plano gratuito e
      por até <strong>12 meses</strong> nos planos pagos, podendo ser configurados pelo administrador
      do workspace. Dados de conta são mantidos enquanto a conta estiver ativa e por até 30 dias
      após o encerramento para fins de recuperação.
    </p>

    <h2>5. Compartilhamento de dados</h2>
    <p>Não vendemos seus dados. Compartilhamos apenas nas seguintes situações:</p>
    <ul>
      <li><strong>Provedores de infraestrutura:</strong> Supabase (banco de dados), Redis/Upstash (cache), provedores de nuvem — todos sob acordos de processamento de dados (DPA)</li>
      <li><strong>Obrigação legal:</strong> Quando exigido por lei, decisão judicial ou autoridade regulatória</li>
      <li><strong>Proteção de direitos:</strong> Para investigar fraudes, abusos ou violações dos nossos termos</li>
    </ul>

    <h2>6. Segurança</h2>
    <p>
      Implementamos criptografia em trânsito (TLS 1.3) e em repouso, controles de acesso por
      função (RBAC), autenticação multifator disponível e monitoramento contínuo de atividades
      suspeitas. Consulte nossa <a href="/security">página de Segurança</a> para detalhes técnicos.
    </p>

    <h2>7. Seus direitos (LGPD)</h2>
    <p>Como titular de dados, você tem direito a:</p>
    <ul>
      <li>Confirmar a existência de tratamento e acessar seus dados</li>
      <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
      <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
      <li>Portabilidade dos dados a outro fornecedor de serviço</li>
      <li>Revogar o consentimento a qualquer momento</li>
      <li>Opor-se ao tratamento em desacordo com a legislação</li>
    </ul>
    <p>
      Para exercer seus direitos, entre em contato com nosso DPO em{" "}
      <a href="mailto:privacidade@sentinela.ai">privacidade@sentinela.ai</a>.
    </p>

    <h2>8. Cookies</h2>
    <p>
      Usamos cookies estritamente necessários para autenticação de sessão e preferências de idioma.
      Não utilizamos cookies de rastreamento de terceiros ou publicidade.
    </p>

    <h2>9. Transferências internacionais</h2>
    <p>
      Parte da nossa infraestrutura opera em data centers fora do Brasil. Todas as transferências
      seguem as salvaguardas previstas na LGPD, incluindo cláusulas contratuais padrão com os
      subprocessadores listados no item 5.
    </p>

    <h2>10. Alterações nesta política</h2>
    <p>
      Notificaremos alterações materiais por e-mail ou aviso dentro da plataforma com antecedência
      mínima de 15 dias. O uso continuado após a vigência da nova política constitui aceitação.
    </p>

    <h2>11. Contato</h2>
    <p>
      Dúvidas sobre privacidade: <a href="mailto:privacidade@sentinela.ai">privacidade@sentinela.ai</a><br />
      Encarregado de Dados (DPO): disponível mediante solicitação<br />
      Baluarte Tecnologia Ltda. — Brasil
    </p>
  </>;
}

function ContentEN() {
  return <>
    <h2>1. Who we are</h2>
    <p>
      Sentinela is an AI quality monitoring platform developed and operated by{" "}
      <strong>Baluarte Tecnologia Ltda.</strong>, headquartered in Brazil. By using Sentinela,
      you agree to the practices described in this policy.
    </p>

    <h2>2. Data we collect</h2>
    <h3>2.1 Account data</h3>
    <p>When you create an account, we collect:</p>
    <ul>
      <li>Name and email address</li>
      <li>Password hash (never the plaintext password)</li>
      <li>Organization / workspace information</li>
      <li>Language preferences and notification settings</li>
    </ul>

    <h3>2.2 Platform usage data</h3>
    <p>To deliver the analysis service, we process:</p>
    <ul>
      <li>AI interaction logs submitted via integration</li>
      <li>Workspace and guardrail configurations</li>
      <li>Analysis history and scores generated by AION</li>
      <li>Execution metadata (timestamps, latencies, run identifiers)</li>
    </ul>

    <h3>2.3 Technical data</h3>
    <ul>
      <li>IP address and device / browser information</li>
      <li>Access logs for security and diagnostics</li>
      <li>Performance data collected via anonymous telemetry</li>
    </ul>

    <div className="callout">
      <p>
        <strong>Important:</strong> AI logs you submit to Sentinela may contain conversations
        from end users. You are responsible for ensuring you have the appropriate legal basis
        to share that data with us, in accordance with applicable law.
      </p>
    </div>

    <h2>3. How we use your data</h2>
    <ul>
      <li>Run AION quality, safety, and cost analyses</li>
      <li>Generate reports, dashboards, and alerts in your workspace</li>
      <li>Authenticate your session and maintain account security</li>
      <li>Send notifications about analysis results and critical alerts</li>
      <li>Improve internal classification and detection models (anonymized data)</li>
      <li>Comply with legal obligations and respond to competent authority requests</li>
    </ul>

    <h2>4. Data retention</h2>
    <p>
      Analysis logs are retained for <strong>90 days</strong> by default on the free plan and
      up to <strong>12 months</strong> on paid plans, configurable by the workspace administrator.
      Account data is kept while the account is active and for up to 30 days after closure for
      recovery purposes.
    </p>

    <h2>5. Data sharing</h2>
    <p>We do not sell your data. We share only in the following situations:</p>
    <ul>
      <li><strong>Infrastructure providers:</strong> Supabase (database), Redis/Upstash (cache), cloud providers — all under data processing agreements (DPA)</li>
      <li><strong>Legal obligation:</strong> When required by law, court order, or regulatory authority</li>
      <li><strong>Rights protection:</strong> To investigate fraud, abuse, or violations of our terms</li>
    </ul>

    <h2>6. Security</h2>
    <p>
      We implement encryption in transit (TLS 1.3) and at rest, role-based access controls (RBAC),
      optional multi-factor authentication, and continuous monitoring for suspicious activity.
      See our <a href="/security">Security page</a> for technical details.
    </p>

    <h2>7. Your rights</h2>
    <p>As a data subject, you have the right to:</p>
    <ul>
      <li>Confirm the existence of processing and access your data</li>
      <li>Correct incomplete, inaccurate, or outdated data</li>
      <li>Request anonymization, blocking, or deletion of unnecessary data</li>
      <li>Data portability to another service provider</li>
      <li>Withdraw consent at any time</li>
      <li>Object to processing contrary to applicable law</li>
    </ul>
    <p>
      To exercise your rights, contact our DPO at{" "}
      <a href="mailto:privacy@sentinela.ai">privacy@sentinela.ai</a>.
    </p>

    <h2>8. Cookies</h2>
    <p>
      We use strictly necessary cookies for session authentication and language preferences.
      We do not use third-party tracking or advertising cookies.
    </p>

    <h2>9. International transfers</h2>
    <p>
      Part of our infrastructure operates in data centers outside Brazil. All transfers follow
      the safeguards required by applicable law, including standard contractual clauses with
      the subprocessors listed in section 5.
    </p>

    <h2>10. Changes to this policy</h2>
    <p>
      We will notify you of material changes by email or in-platform notice at least 15 days
      before they take effect. Continued use after the new policy takes effect constitutes acceptance.
    </p>

    <h2>11. Contact</h2>
    <p>
      Privacy inquiries: <a href="mailto:privacy@sentinela.ai">privacy@sentinela.ai</a><br />
      Data Protection Officer (DPO): available upon request<br />
      Baluarte Tecnologia Ltda. — Brazil
    </p>
  </>;
}
