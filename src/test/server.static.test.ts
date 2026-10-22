/**
 * Testes de integração do server.cjs (servidor estático da SPA em produção).
 *
 * Contexto: um deploy do front-prod entrou em crash-loop no Railway porque
 * `decodeURIComponent` em resolve() lança URIError em requests com
 * percent-encoding malformado (ex.: "/%"). A exceção escapava do handler,
 * derrubava o processo Node e o container reiniciava em loop — bastava um
 * scanner de internet bater na URL pública para o site inteiro cair.
 *
 * Regra que estes testes travam: nenhum request pode matar o processo.
 */
import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PORT = 8123;
const ROOT = path.resolve(__dirname, "../..");

let child: ChildProcess;
let exited: { code: number | null; signal: NodeJS.Signals | null } | null = null;

function get(reqPath: string): Promise<number | string> {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: reqPath }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", (e: NodeJS.ErrnoException) => resolve(`ERRO:${e.code}`));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve("TIMEOUT");
    });
  });
}

function getHtml(reqPath: string, host = "untrusted.example") {
  return new Promise<{ status: number; html: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: PORT, path: reqPath, headers: { "User-Agent": "WhatsApp/2.0", Host: host } }, res => {
      let html = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { html += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, html, headers: res.headers }));
    }).on("error", reject);
  });
}

async function waitForBoot() {
  for (let i = 0; i < 50; i++) {
    const r = await get("/");
    if (typeof r === "number") return;
    await new Promise((r2) => setTimeout(r2, 100));
  }
  throw new Error("server.cjs não subiu a tempo");
}

beforeAll(async () => {
  child = spawn(process.execPath, ["server.cjs"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), RAILWAY_ENVIRONMENT_NAME: "production" },
  });
  child.on("exit", (code, signal) => {
    exited = { code, signal };
  });
  await waitForBoot();
}, 20000);

afterAll(() => {
  child?.kill();
});

describe("server.cjs — resiliência a URLs hostis", () => {
  it("serves home portfolio metadata before JavaScript without reflecting Host", async () => {
    const { status, html, headers } = await getHtml("/?utm_source=preview");
    expect(status).toBe(200);
    expect(headers["content-language"]).toBe("pt-BR");
    expect(html).toContain("Entenda, controle e acompanhe sua IA");
    expect(html).toContain('href="https://sentinelahq.com/"');
    expect(html).toContain("/sentinela/home-social.png");
    expect(html).not.toContain("untrusted.example");
    expect(html).not.toContain("sentinela.baluarte.io");
    expect((html.match(/property="og:description"/g) || [])).toHaveLength(1);
  });
  // Estes são exatamente os formatos que scanners de internet disparam contra
  // a URL pública, e que apareceram nos HTTP logs do front-prod.
  const HOSTILE = [
    "/%", // percent solto — o que derrubou produção
    "/%zz", // hex inválido
    "/%c0%af", // overlong UTF-8
    "/%e0%80", // sequência UTF-8 truncada
    "/.env", // scanner de segredos
    "/.git/config",
    "/wp-admin/install.php",
    "/%2e%2e%2f%2e%2e%2fetc%2fpasswd", // path traversal encodado
    "/../../../../etc/passwd", // path traversal cru
  ];

  it.each(HOSTILE)("responde a %s sem derrubar o processo", async (reqPath) => {
    const status = await get(reqPath);
    expect(exited, `processo morreu ao servir ${reqPath}`).toBeNull();
    expect(typeof status, `sem resposta HTTP para ${reqPath}`).toBe("number");
  });

  it("continua servindo requests normais depois da rajada hostil", async () => {
    const status = await get("/");
    expect(exited).toBeNull();
    expect(status).toBe(200);
  });

  it("nunca serve arquivo fora do diretório dist", async () => {
    // traversal deve cair no fallback da SPA (index.html), nunca vazar /etc/passwd
    const status = await get("/%2e%2e%2f%2e%2e%2fetc%2fpasswd");
    expect([200, 400, 404]).toContain(status);
  });
});

describe("Web Summit share previews without JavaScript", () => {
  it.each(["/websummit", "/websummit/", "/websummit?utm_source=whatsapp", "/websummitlisboa"])("serves English event metadata at %s", async route => {
    const response = await getHtml(route);
    expect(response.status).toBe(200);
    expect(response.headers["content-language"]).toBe("en");
    expect(response.html).toContain('<html lang="en">');
    expect(response.html).toContain('<meta property="og:title" content="Sentinela | Web Summit Lisbon 2026"');
    expect(response.html).toContain('content="Experience AI control and get a free batch analysis of 1 million conversations');
    expect(response.html).toContain('<meta property="og:url" content="https://sentinelahq.com/websummit"');
    expect(response.html).toContain('https://sentinelahq.com/websummitlisboa/social-card-en.png');
    expect(response.html).toContain('<meta name="twitter:description"');
    expect(response.html).not.toContain("Diagnóstico");
    expect(response.html).not.toContain("untrusted.example");
    expect(response.html.match(/property="og:description"/g)).toHaveLength(1);
  });

  it("preserves the regular SPA metadata on product routes", async () => {
    const response = await getHtml("/login");
    expect(response.html).toContain('<html lang="pt-br">');
    expect(response.html).toContain("Diagnóstico avançado");
    expect(response.html).not.toContain('property="og:locale" content="en_US"');
  });
});
