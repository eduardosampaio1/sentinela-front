// O diagrama do fluxo do proxy.
//
// SVG animado por CSS, ~124 linhas de geometria. Não tem estado nem texto de produto: mexer aqui é
// mexer em desenho, e por isso ele não deve estar no caminho de quem edita seção.

import { A, display } from "./tokens";

const FLOW_CSS = `
  @keyframes dash-flow { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
  @keyframes dash-nemos { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }
  @keyframes pkt-fade { 0%,100%{opacity:0} 15%,85%{opacity:1} }
  @keyframes node-glow { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes nemos-pulse { 0%,100%{filter:drop-shadow(0 0 6px #EAB30840)} 50%{filter:drop-shadow(0 0 14px #EAB30880)} }
  .dash-main  { stroke-dasharray:5 5; animation: dash-flow  .7s linear infinite; }
  .dash-nemos { stroke-dasharray:4 4; animation: dash-nemos 1.4s linear infinite; }
  .node-ctrl  { animation: node-glow 3s ease-in-out infinite 0s; }
  .node-dec   { animation: node-glow 3s ease-in-out infinite .8s; }
  .node-opt   { animation: node-glow 3s ease-in-out infinite 1.6s; }
  .nemos-box  { animation: nemos-pulse 2s ease-in-out infinite; }
`;

export function ProxyFlowDiagram() {
  // viewBox: 760 × 210
  // Controls cx=145  Decides cx=380  Optimizes cx=615  Nemos cx=380,cy=168
  const box = (cx: number, cy: number, label: string, sub: string, color: string, cls: string) => (
    <g key={label} className={cls}>
      <rect x={cx - 72} y={cy - 26} width={144} height={52} rx={10}
        fill={`${color}12`} stroke={color} strokeWidth={1.2} strokeOpacity={.5} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
        style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', system-ui" }}>{label}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={A.muted}
        style={{ fontSize: "10px", fontFamily: "'Inter', system-ui" }}>{sub}</text>
    </g>
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "#0C1528", borderColor: A.border }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: A.border }}>
        <span className="text-xs font-semibold" style={{ color: A.muted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Request flow
        </span>
        <span className="text-xs" style={{ color: A.muted }}>Every request · every token</span>
      </div>

      <svg viewBox="0 0 760 210" className="w-full" style={{ display: "block" }}>
        <style>{FLOW_CSS}</style>
        <defs>
          {/* Main horizontal path */}
          <path id="p-main"  d="M 16 80 H 744" />
          {/* NEMOS connections */}
          <path id="p-an"  d="M 145 106 C 145 145 308 168 308 168" />
          <path id="p-bn"  d="M 380 106 V 142" />
          <path id="p-cn"  d="M 615 106 C 615 145 452 168 452 168" />
          <path id="p-na"  d="M 308 168 C 308 168 145 145 145 106" />
          <path id="p-nb"  d="M 380 142 V 106" />
          <path id="p-nc"  d="M 452 168 C 452 168 615 145 615 106" />
          {/* Arrowhead */}
          <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={A.primary} opacity=".5"/>
          </marker>
        </defs>

        {/* ── Track lines ─────────────────────────────────── */}
        {/* Horizontal segments */}
        <line x1="16" y1="80" x2="73" y2="80" stroke={A.estixe} strokeWidth="1" strokeOpacity=".2"/>
        <line x1="217" y1="80" x2="308" y2="80" stroke={A.estixe} strokeWidth="1" strokeOpacity=".2" className="dash-main"/>
        <line x1="452" y1="80" x2="543" y2="80" stroke={A.nomos}  strokeWidth="1" strokeOpacity=".2" className="dash-main" style={{ animationDelay: "-.3s" }}/>
        <line x1="687" y1="80" x2="744" y2="80" stroke={A.metis}  strokeWidth="1" strokeOpacity=".2"/>

        {/* Animated flowing arrows between modules */}
        <line x1="217" y1="80" x2="308" y2="80" stroke={A.estixe} strokeWidth="1.5" strokeOpacity=".7" className="dash-main"/>
        <line x1="452" y1="80" x2="543" y2="80" stroke={A.nomos}  strokeWidth="1.5" strokeOpacity=".7" className="dash-main" style={{ animationDelay: "-.3s" }}/>

        {/* NEMOS connection tracks */}
        <path d="M 145 106 C 145 145 308 168 308 168" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        <path d="M 380 106 V 142" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        <path d="M 615 106 C 615 145 452 168 452 168" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        {/* NEMOS animated feeds */}
        <path d="M 145 106 C 145 145 308 168 308 168" fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos"/>
        <path d="M 380 106 V 142"                     fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos" style={{ animationDelay: "-.5s" }}/>
        <path d="M 615 106 C 615 145 452 168 452 168" fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos" style={{ animationDelay: "-1s" }}/>
        {/* Feedback up */}
        <path d="M 308 168 C 308 168 145 145 145 106" fill="none" stroke={A.nemos} strokeWidth="1"   strokeOpacity=".3" className="dash-nemos" style={{ animationDelay: "-2s" }}/>
        <path d="M 452 168 C 452 168 615 145 615 106" fill="none" stroke={A.nemos} strokeWidth="1"   strokeOpacity=".3" className="dash-nemos" style={{ animationDelay: "-2.8s" }}/>

        {/* ── Moving packets on main flow ──────────────────── */}
        {[0, 0.9, 1.8].map((delay, i) => (
          <circle key={i} r="5" fill={A.primary} opacity="0">
            <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href="#p-main"/>
            </animateMotion>
            <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;1;1;0;0" keyTimes="0;0.05;0.1;0.88;0.95;1"/>
          </circle>
        ))}

        {/* NEMOS downward packets (learning capture) */}
        {([["#p-an", 0], ["#p-bn", 1.1], ["#p-cn", 2.2]] as [string, number][]).map(([path, delay]) => (
          <circle key={path} r="3.5" fill={A.nemos} opacity="0">
            <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href={path}/>
            </animateMotion>
            <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;0.9;0.9;0;0" keyTimes="0;0.05;0.15;0.85;0.95;1"/>
          </circle>
        ))}

        {/* NEMOS feedback packets (going up) */}
        {([["#p-na", 1.8], ["#p-nb", 2.4], ["#p-nc", 3.0]] as [string, number][]).map(([path, delay]) => (
          <circle key={path + "r"} r="3" fill={A.nemos} opacity="0">
            <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href={path}/>
            </animateMotion>
            <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;0.6;0.6;0;0" keyTimes="0;0.05;0.15;0.85;0.95;1"/>
          </circle>
        ))}

        {/* ── Module nodes ─────────────────────────────────── */}
        {/* Input label */}
        <text x="8" y="75" fill={A.muted} style={{ fontSize: "9px", fontFamily: "'Inter', system-ui" }}>Request</text>

        {box(145, 80, "Controls",  "Guard the gate",          A.estixe, "node-ctrl")}
        {box(380, 80, "Decides",   "Route intelligently",     A.nomos,  "node-dec")}
        {box(615, 80, "Optimizes", "Compress & cache",        A.metis,  "node-opt")}

        {/* NEMOS node */}
        <g className="nemos-box">
          <rect x={308} y={142} width={144} height={52} rx={10}
            fill={`${A.nemos}10`} stroke={A.nemos} strokeWidth={1.2} strokeOpacity={.4}/>
          <text x="380" y="163" textAnchor="middle" fill={A.nemos}
            style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', system-ui" }}>Learning Engine</text>
          <text x="380" y="179" textAnchor="middle" fill={A.muted}
            style={{ fontSize: "10px", fontFamily: "'Inter', system-ui" }}>Learns from every request</text>
        </g>

        {/* Output label */}
        <text x="695" y="75" fill={A.muted} style={{ fontSize: "9px", fontFamily: "'Inter', system-ui" }}>LLM</text>
      </svg>
    </div>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────────
