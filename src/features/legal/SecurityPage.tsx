import { useLanguage } from "@/contexts/LanguageContext";
import { LegalPage } from "./LegalPage";

export function SecurityPage() {
  const { language } = useLanguage();
  const pt = language === "pt";

  return (
    <LegalPage
      title="Security"
      subtitle={pt
        ? "Como protegemos sua infraestrutura de dados e o que esperamos dos pesquisadores de segurança."
        : "How we protect your data infrastructure and what we expect from security researchers."}
      updated="April 28, 2025">

      {pt ? <ContentPT /> : <ContentEN />}
    </LegalPage>
  );
}

function ContentPT() {
  return <>
    <h2>Infraestrutura e proteção de dados</h2>

    <h3>Criptografia</h3>
    <p>
      Todo o tráfego entre seus sistemas e o Sentinela é protegido por{" "}
      <strong>TLS 1.3</strong>. Os dados armazenados em banco de dados e backups são cifrados
      em repouso com <strong>AES-256</strong>. Chaves de API e credenciais de integrações são
      armazenadas com criptografia adicional de nível aplicação.
    </p>

    <h3>Autenticação e controle de acesso</h3>
    <ul>
      <li>Autenticação gerenciada via Supabase Auth com suporte a OAuth 2.0</li>
      <li>Senhas armazenadas como hashes bcrypt — nunca em texto simples</li>
      <li>Controle de acesso por função (RBAC) dentro de workspaces</li>
      <li>Tokens de sessão com expiração automática e rotação</li>
      <li>Suporte a MFA disponível para todas as contas</li>
    </ul>

    <h3>Isolamento de dados</h3>
    <p>
      Cada workspace opera com isolamento lógico completo. Row-Level Security (RLS) é aplicada
      em nível de banco de dados para garantir que um tenant jamais acesse dados de outro,
      mesmo em caso de falha de lógica de aplicação.
    </p>

    <h3>Infraestrutura</h3>
    <ul>
      <li>Hospedagem em provedores de nuvem com certificações SOC 2 e ISO 27001</li>
      <li>Redis/Upstash para cache com TTL controlado — dados sensíveis nunca persistem no cache</li>
      <li>Backups automáticos com retenção conforme política de dados</li>
      <li>Ambientes de produção, staging e desenvolvimento completamente separados</li>
    </ul>

    <h2>Práticas de desenvolvimento seguro</h2>
    <ul>
      <li>Revisão de código obrigatória antes de qualquer deploy em produção</li>
      <li>Dependências monitoradas com alertas automáticos de CVEs (Dependabot)</li>
      <li>Secrets gerenciados via variáveis de ambiente — nunca commitados em repositório</li>
      <li>Pipeline CI/CD com verificações de segurança estáticas</li>
      <li>Princípio do menor privilégio aplicado a todos os serviços internos</li>
    </ul>

    <h2>Monitoramento e resposta a incidentes</h2>
    <p>
      Mantemos monitoramento contínuo de atividades suspeitas, tentativas de acesso não
      autorizado e anomalias de comportamento. Em caso de incidente de segurança que afete
      seus dados, notificaremos dentro de <strong>72 horas</strong> após a confirmação,
      conforme requisitos da LGPD.
    </p>

    <h2>Programa de divulgação responsável</h2>
    <p>
      Valorizamos a contribuição da comunidade de segurança. Se você descobrir uma
      vulnerabilidade no Sentinela, pedimos que siga as práticas de divulgação responsável:
    </p>
    <ul>
      <li>Reporte a descoberta para <a href="mailto:security@sentinela.ai">security@sentinela.ai</a></li>
      <li>Inclua passos detalhados de reprodução, impacto estimado e sugestões de mitigação</li>
      <li>Não explore a vulnerabilidade além do necessário para demonstrar o problema</li>
      <li>Não acesse, modifique ou exfiltre dados de outros usuários</li>
      <li>Aguarde nossa confirmação antes de qualquer divulgação pública</li>
    </ul>
    <div className="callout">
      <p>
        Comprometemo-nos a responder à sua solicitação em até <strong>5 dias úteis</strong> e a
        trabalhar em conjunto para resolver vulnerabilidades confirmadas de forma coordenada.
        Agradecemos pesquisadores que atuem de boa fé.
      </p>
    </div>

    <h2>Escopo do programa</h2>
    <p>Estão <strong>dentro</strong> do escopo:</p>
    <ul>
      <li>sentinela.ai e todos os subdomínios</li>
      <li>API pública do Sentinela (api.sentinela.ai)</li>
      <li>Aplicação web (app.sentinela.ai)</li>
    </ul>
    <p>Estão <strong>fora</strong> do escopo:</p>
    <ul>
      <li>Ataques de engenharia social ou phishing contra funcionários</li>
      <li>Ataques de negação de serviço (DoS/DDoS)</li>
      <li>Vulnerabilidades em dependências de terceiros sem demonstração de impacto real</li>
      <li>Problemas de segurança física</li>
    </ul>

    <h2>Contato de segurança</h2>
    <p>
      Para relatar vulnerabilidades ou incidentes de segurança:<br />
      <a href="mailto:security@sentinela.ai">security@sentinela.ai</a><br />
      PGP disponível mediante solicitação.
    </p>
  </>;
}

function ContentEN() {
  return <>
    <h2>Infrastructure and data protection</h2>

    <h3>Encryption</h3>
    <p>
      All traffic between your systems and Sentinela is protected by <strong>TLS 1.3</strong>.
      Data stored in the database and backups is encrypted at rest with <strong>AES-256</strong>.
      API keys and integration credentials are stored with additional application-level encryption.
    </p>

    <h3>Authentication and access control</h3>
    <ul>
      <li>Authentication managed via Supabase Auth with OAuth 2.0 support</li>
      <li>Passwords stored as bcrypt hashes — never in plaintext</li>
      <li>Role-based access control (RBAC) within workspaces</li>
      <li>Session tokens with automatic expiry and rotation</li>
      <li>MFA support available for all accounts</li>
    </ul>

    <h3>Data isolation</h3>
    <p>
      Each workspace operates with full logical isolation. Row-Level Security (RLS) is enforced
      at the database level to ensure one tenant can never access another's data, even in the
      event of application-layer logic failure.
    </p>

    <h3>Infrastructure</h3>
    <ul>
      <li>Hosted on cloud providers with SOC 2 and ISO 27001 certifications</li>
      <li>Redis/Upstash for cache with controlled TTL — sensitive data never persists in cache</li>
      <li>Automatic backups with retention per data policy</li>
      <li>Production, staging, and development environments fully separated</li>
    </ul>

    <h2>Secure development practices</h2>
    <ul>
      <li>Mandatory code review before any production deployment</li>
      <li>Dependencies monitored with automatic CVE alerts (Dependabot)</li>
      <li>Secrets managed via environment variables — never committed to the repository</li>
      <li>CI/CD pipeline with static security checks</li>
      <li>Principle of least privilege applied to all internal services</li>
    </ul>

    <h2>Monitoring and incident response</h2>
    <p>
      We maintain continuous monitoring for suspicious activity, unauthorized access attempts,
      and behavioral anomalies. In the event of a security incident affecting your data, we will
      notify you within <strong>72 hours</strong> of confirmation, in accordance with applicable
      data protection law.
    </p>

    <h2>Responsible disclosure program</h2>
    <p>
      We value contributions from the security community. If you discover a vulnerability in
      Sentinela, we ask that you follow responsible disclosure practices:
    </p>
    <ul>
      <li>Report the finding to <a href="mailto:security@sentinela.ai">security@sentinela.ai</a></li>
      <li>Include detailed reproduction steps, estimated impact, and mitigation suggestions</li>
      <li>Do not exploit the vulnerability beyond what is necessary to demonstrate the issue</li>
      <li>Do not access, modify, or exfiltrate data belonging to other users</li>
      <li>Wait for our confirmation before any public disclosure</li>
    </ul>
    <div className="callout">
      <p>
        We commit to acknowledging your report within <strong>5 business days</strong> and
        working together to resolve confirmed vulnerabilities in a coordinated manner.
        We appreciate researchers who act in good faith.
      </p>
    </div>

    <h2>Program scope</h2>
    <p>Assets <strong>in scope</strong>:</p>
    <ul>
      <li>sentinela.ai and all subdomains</li>
      <li>Sentinela public API (api.sentinela.ai)</li>
      <li>Web application (app.sentinela.ai)</li>
    </ul>
    <p>Assets <strong>out of scope</strong>:</p>
    <ul>
      <li>Social engineering or phishing attacks against employees</li>
      <li>Denial-of-service attacks (DoS/DDoS)</li>
      <li>Vulnerabilities in third-party dependencies without demonstrated real impact</li>
      <li>Physical security issues</li>
    </ul>

    <h2>Security contact</h2>
    <p>
      To report vulnerabilities or security incidents:<br />
      <a href="mailto:security@sentinela.ai">security@sentinela.ai</a><br />
      PGP key available upon request.
    </p>
  </>;
}
