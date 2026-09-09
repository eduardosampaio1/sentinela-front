import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SentinelaLogo } from "@/components/brand/SentinelaLogo";
import { useLanguage } from "@/contexts/LanguageContext";

interface AuthShellProps {
  children: ReactNode;
  /** Login, registration and recovery share this calm product context. */
  showValueProp?: boolean;
}

const SIGNALS = ["observe", "decide", "control"] as const;

export function AuthShell({ children, showValueProp = true }: AuthShellProps) {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "pt" ? "en" : "pt";

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#07090d] text-[#f3f6f8]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_22%,rgba(82,168,232,0.12),transparent_27%),radial-gradient(circle_at_78%_72%,rgba(54,127,188,0.08),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(207,226,242,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(207,226,242,0.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
      />

      <header className="absolute inset-x-0 top-0 z-20 flex min-h-[76px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          to="/"
          aria-label={t("auth.backHome")}
          className="rounded-md text-[#f3f6f8] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86c9f4]"
        >
          <SentinelaLogo
            luminous
            markSize={28}
            markClassName="text-[#86c9f4] drop-shadow-[0_0_10px_rgba(82,168,232,0.24)]"
            wordmarkClassName="text-[0.72rem] font-semibold tracking-[0.25em]"
          />
        </Link>
        <button
          type="button"
          onClick={() => setLanguage(nextLanguage)}
          className="min-h-11 min-w-11 rounded-xl border border-transparent px-3 font-mono text-[0.68rem] font-medium tracking-[0.12em] text-[#748294] transition-colors hover:border-[rgba(134,201,244,0.3)] hover:bg-[rgba(20,29,40,0.65)] hover:text-[#f3f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86c9f4]"
          aria-label={t("auth.languageAction")}
        >
          {nextLanguage.toUpperCase()}
        </button>
      </header>

      {showValueProp ? (
        <aside className="relative z-10 hidden w-[48%] flex-col justify-end border-r border-[rgba(207,226,242,0.1)] px-[clamp(3rem,6vw,7.5rem)] pb-[clamp(4rem,9vh,7rem)] pt-28 lg:flex xl:w-[52%]">
          <div className="max-w-[42rem]">
            <p className="mb-6 font-mono text-[0.66rem] font-medium uppercase tracking-[0.24em] text-[#86c9f4]">
              {t("auth.portalEyebrow")}
            </p>
            <h2 className="max-w-[12ch] text-[clamp(3.4rem,5.2vw,6.4rem)] font-medium leading-[0.93] tracking-[-0.065em] text-balance">
              {t("auth.portalTitle")}
            </h2>
            <p className="mt-7 max-w-[54ch] text-base leading-7 text-[#9ca8b5]">
              {t("auth.portalBody")}
            </p>

            <div className="mt-11 grid max-w-[36rem] grid-cols-3 border-y border-[rgba(207,226,242,0.12)] py-5">
              {SIGNALS.map((signal, index) => (
                <div
                  key={signal}
                  className="flex items-center gap-2.5 border-r border-[rgba(207,226,242,0.1)] px-3 first:pl-0 last:border-r-0"
                >
                  <span className="grid size-6 place-items-center rounded-full border border-[rgba(134,201,244,0.3)] font-mono text-[0.58rem] text-[#86c9f4]">
                    {index + 1}
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.13em] text-[#9ca8b5]">
                    {t(`auth.signal.${signal}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      ) : null}

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 pt-28 sm:px-12 lg:px-[clamp(3rem,7vw,8rem)]">
        <div className="w-full max-w-[28rem]">
          <p className="mb-8 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#748294] lg:hidden">
            {t("auth.portalEyebrow")}
          </p>
          {children}
          <p className="mt-9 border-t border-[rgba(207,226,242,0.1)] pt-5 text-xs leading-5 text-[#748294]">
            {t("auth.portalFooter")}
          </p>
        </div>
      </main>
    </div>
  );
}
