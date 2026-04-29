import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "./LegalPage";

export function TermsPage() {
  const { language } = useLanguage();
  const pt = language === "pt";

  return (
    <LegalPage
      title={pt ? "Termos de Uso" : "Terms of Use"}
      subtitle={pt
        ? "As condições que regem o uso da plataforma Sentinela e dos serviços AION."
        : "The conditions governing use of the Sentinela platform and AION services."}
      updated="April 28, 2025">

      {pt ? <ContentPT /> : <ContentEN />}
    </LegalPage>
  );
}

function ContentPT() {
  return <>
    <h2>1. Aceitação dos termos</h2>
    <p>
      Ao acessar ou utilizar o Sentinela, você — seja em nome próprio ou de uma organização —
      concorda com estes Termos de Uso. Se não concordar, não utilize a plataforma.
    </p>

    <h2>2. Descrição do serviço</h2>
    <p>
      O Sentinela oferece análise automatizada de qualidade, segurança e custo de sistemas de IA
      por meio do motor AION. O serviço inclui dashboards de monitoramento, guardrails configuráveis,
      histórico de análises e integrações via API.
    </p>

    <h2>3. Elegibilidade e contas</h2>
    <ul>
      <li>Você deve ter 18 anos ou mais para criar uma conta</li>
      <li>Cada conta pertence a uma pessoa ou organização específica e não pode ser transferida</li>
      <li>Você é responsável por manter a confidencialidade das suas credenciais</li>
      <li>Notifique-nos imediatamente em caso de acesso não autorizado à sua conta</li>
      <li>Contas de organização podem ter múltiplos membros gerenciados pelo administrador do workspace</li>
    </ul>

    <h2>4. Uso aceitável</h2>
    <p>Você concorda em NÃO utilizar a plataforma para:</p>
    <ul>
      <li>Submeter dados que violem direitos de terceiros, incluindo dados pessoais sem base legal</li>
      <li>Tentar acessar contas, sistemas ou dados de outros usuários sem autorização</li>
      <li>Realizar engenharia reversa, descompilar ou extrair o código-fonte da plataforma</li>
      <li>Utilizar métodos automatizados para sobrecarregar a infraestrutura (ataques de força bruta, DDoS)</li>
      <li>Revender ou sublicenciar o acesso à plataforma sem autorização expressa</li>
      <li>Contornar limites de rate limiting ou cotas do plano</li>
    </ul>

    <h2>5. Dados do cliente</h2>
    <p>
      Você retém a propriedade plena dos logs, configurações e dados que envia ao Sentinela
      ("Dados do Cliente"). Você nos concede uma licença limitada, não exclusiva e não transferível
      para processar esses dados com a única finalidade de prestar o serviço.
    </p>
    <div className="callout">
      <p>
        <strong>Sua responsabilidade:</strong> Você é o único responsável pela legalidade dos
        Dados do Cliente que submete, incluindo obter os consentimentos necessários de usuários
        finais cujas interações sejam analisadas.
      </p>
    </div>

    <h2>6. Propriedade intelectual</h2>
    <p>
      O Sentinela, o motor AION, os algoritmos de análise, o design da plataforma e toda
      documentação associada são de propriedade exclusiva da Baluarte Tecnologia Ltda. e protegidos
      por leis de propriedade intelectual. Estes Termos não transferem nenhum direito sobre a
      plataforma além do acesso limitado descrito aqui.
    </p>

    <h2>7. Planos, pagamentos e cancelamento</h2>
    <ul>
      <li>O plano gratuito está sujeito a limites de uso descritos na página de Pricing</li>
      <li>Planos pagos são cobrados conforme o ciclo de faturamento selecionado (mensal ou anual)</li>
      <li>Você pode cancelar a qualquer momento; o acesso premium permanece até o fim do período pago</li>
      <li>Não realizamos reembolsos proporcionais por cancelamento antecipado, salvo exigência legal</li>
      <li>Reservamo-nos o direito de alterar preços com aviso prévio de 30 dias</li>
    </ul>

    <h2>8. Disponibilidade e SLA</h2>
    <p>
      Nos esforçamos para manter disponibilidade de <strong>99,5%</strong> mensal para planos pagos.
      Manutenções programadas serão comunicadas com antecedência. O plano gratuito não possui
      garantia de disponibilidade.
    </p>

    <h2>9. Limitação de responsabilidade</h2>
    <p>
      Na extensão máxima permitida pela lei, a Baluarte Tecnologia não será responsável por danos
      indiretos, incidentais, consequenciais ou punitivos resultantes do uso ou incapacidade de
      uso da plataforma. Nossa responsabilidade total não excederá o valor pago por você nos
      12 meses anteriores ao evento que deu origem à reclamação.
    </p>
    <p>
      Os resultados gerados pelo AION são informativos e não substituem a revisão humana
      especializada. Decisões baseadas nas análises são de exclusiva responsabilidade do usuário.
    </p>

    <h2>10. Suspensão e encerramento</h2>
    <p>
      Podemos suspender ou encerrar contas que violem estes Termos, representem risco de segurança
      ou apresentem inadimplência. Em casos de violações graves, a suspensão pode ser imediata.
      Você pode encerrar sua conta a qualquer momento nas configurações do workspace.
    </p>

    <h2>11. Modificações nos termos</h2>
    <p>
      Podemos atualizar estes Termos periodicamente. Notificaremos alterações materiais por e-mail
      ou aviso na plataforma com pelo menos 15 dias de antecedência. O uso continuado constitui
      aceitação dos novos termos.
    </p>

    <h2>12. Lei aplicável e foro</h2>
    <p>
      Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
      da comarca de São Paulo — SP como competente para dirimir quaisquer controvérsias, com
      renúncia a qualquer outro, por mais privilegiado que seja.
    </p>

    <h2>13. Contato</h2>
    <p>
      Dúvidas sobre estes Termos: <a href="mailto:legal@sentinela.ai">legal@sentinela.ai</a><br />
      Baluarte Tecnologia Ltda. — Brasil
    </p>
  </>;
}

function ContentEN() {
  return <>
    <h2>1. Acceptance of terms</h2>
    <p>
      By accessing or using Sentinela — whether on your own behalf or on behalf of an organization —
      you agree to these Terms of Use. If you do not agree, do not use the platform.
    </p>

    <h2>2. Service description</h2>
    <p>
      Sentinela provides automated quality, safety, and cost analysis of AI systems through the
      AION engine. The service includes monitoring dashboards, configurable guardrails, analysis
      history, and API integrations.
    </p>

    <h2>3. Eligibility and accounts</h2>
    <ul>
      <li>You must be 18 years or older to create an account</li>
      <li>Each account belongs to a specific person or organization and may not be transferred</li>
      <li>You are responsible for maintaining the confidentiality of your credentials</li>
      <li>Notify us immediately of any unauthorized access to your account</li>
      <li>Organization accounts may have multiple members managed by the workspace administrator</li>
    </ul>

    <h2>4. Acceptable use</h2>
    <p>You agree NOT to use the platform to:</p>
    <ul>
      <li>Submit data that violates third-party rights, including personal data without legal basis</li>
      <li>Attempt to access other users' accounts, systems, or data without authorization</li>
      <li>Reverse-engineer, decompile, or extract the platform's source code</li>
      <li>Use automated methods to overload infrastructure (brute force, DDoS attacks)</li>
      <li>Resell or sublicense platform access without express authorization</li>
      <li>Circumvent rate limits or plan quotas</li>
    </ul>

    <h2>5. Customer data</h2>
    <p>
      You retain full ownership of the logs, configurations, and data you submit to Sentinela
      ("Customer Data"). You grant us a limited, non-exclusive, non-transferable license to
      process that data for the sole purpose of providing the service.
    </p>
    <div className="callout">
      <p>
        <strong>Your responsibility:</strong> You are solely responsible for the legality of
        the Customer Data you submit, including obtaining necessary consents from end users
        whose interactions are being analyzed.
      </p>
    </div>

    <h2>6. Intellectual property</h2>
    <p>
      Sentinela, the AION engine, analysis algorithms, platform design, and all associated
      documentation are the exclusive property of Baluarte Tecnologia Ltda. and protected by
      intellectual property law. These Terms do not transfer any rights over the platform beyond
      the limited access described here.
    </p>

    <h2>7. Plans, payments, and cancellation</h2>
    <ul>
      <li>The free plan is subject to usage limits described on the Pricing page</li>
      <li>Paid plans are billed according to the selected billing cycle (monthly or annual)</li>
      <li>You may cancel at any time; premium access remains until the end of the paid period</li>
      <li>We do not provide prorated refunds for early cancellation, unless required by law</li>
      <li>We reserve the right to change prices with 30 days' notice</li>
    </ul>

    <h2>8. Availability and SLA</h2>
    <p>
      We target <strong>99.5%</strong> monthly uptime for paid plans. Scheduled maintenance
      will be communicated in advance. The free plan carries no uptime guarantee.
    </p>

    <h2>9. Limitation of liability</h2>
    <p>
      To the fullest extent permitted by law, Baluarte Tecnologia shall not be liable for
      indirect, incidental, consequential, or punitive damages arising from the use or inability
      to use the platform. Our total liability shall not exceed the amount you paid in the
      12 months prior to the event giving rise to the claim.
    </p>
    <p>
      Results generated by AION are informational and do not replace expert human review.
      Decisions based on the analyses are the sole responsibility of the user.
    </p>

    <h2>10. Suspension and termination</h2>
    <p>
      We may suspend or terminate accounts that violate these Terms, pose a security risk, or
      are in default. For serious violations, suspension may be immediate. You may close your
      account at any time in workspace settings.
    </p>

    <h2>11. Changes to these terms</h2>
    <p>
      We may update these Terms periodically. We will notify you of material changes by email
      or in-platform notice at least 15 days in advance. Continued use constitutes acceptance.
    </p>

    <h2>12. Governing law and jurisdiction</h2>
    <p>
      These Terms are governed by the laws of the Federative Republic of Brazil. The courts of
      São Paulo — SP shall have exclusive jurisdiction over any disputes arising under these Terms.
    </p>

    <h2>13. Contact</h2>
    <p>
      Questions about these Terms: <a href="mailto:legal@sentinela.ai">legal@sentinela.ai</a><br />
      Baluarte Tecnologia Ltda. — Brazil
    </p>
  </>;
}
