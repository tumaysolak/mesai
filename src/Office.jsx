import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// The office is drawn in an isometric projection. Everything below works in
// "world" units on a flat floor; `iso` turns a world point into the picture.
// Keeping one projection in one place means a desk, a slab and a road all
// agree on where they are, and the HTML labels can sit on top of the same grid.
// ---------------------------------------------------------------------------
const COS = 0.866;
const iso = (x, y, z = 0) => [(x - y) * COS, (x + y) * 0.5 - z];
const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

// The drawing lives in this box; the stage keeps the same shape so an HTML
// label can be placed with a percentage and land on the right tile.
export const VIEW = { x: -1180, y: -950, w: 2360, h: 1900 };
const pctX = (vx) => ((vx - VIEW.x) / VIEW.w) * 100;
const pctY = (vy) => ((vy - VIEW.y) / VIEW.h) * 100;

function shade(hex, amount) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const mix = (c) =>
    Math.max(0, Math.min(255, Math.round(c * amount)))
      .toString(16)
      .padStart(2, "0");
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

// A box on the floor: the lid plus the two faces the camera can see.
function Box({ x, y, w, d, h, color, z = 0, opacity = 1 }) {
  const top = [
    iso(x, y, z + h),
    iso(x + w, y, z + h),
    iso(x + w, y + d, z + h),
    iso(x, y + d, z + h),
  ];
  const front = [
    iso(x, y + d, z + h),
    iso(x + w, y + d, z + h),
    iso(x + w, y + d, z),
    iso(x, y + d, z),
  ];
  const side = [
    iso(x + w, y, z + h),
    iso(x + w, y + d, z + h),
    iso(x + w, y + d, z),
    iso(x + w, y, z),
  ];
  return (
    <g opacity={opacity}>
      <polygon points={front.map(pt).join(" ")} fill={shade(color, 0.6)} />
      <polygon points={side.map(pt).join(" ")} fill={shade(color, 0.44)} />
      <polygon points={top.map(pt).join(" ")} fill={color} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Six floors. Every persona department the engine can invent is routed to one
// of them, so a new hire never lands outside the building.
// ---------------------------------------------------------------------------
export const DEPARTMENTS = [
  {
    id: "strateji",
    name: "STRATEJİ",
    color: "#d0763c",
    holds: ["Strateji"],
    metric: "Kararlar",
    note: "Yön, öncelik, devam kararı",
    col: 0,
    row: 0,
  },
  {
    id: "urun",
    name: "ÜRÜN",
    color: "#cc7f8d",
    holds: ["Ürün", "Tasarım", "Araştırma", "İletişim"],
    metric: "Çıktılar",
    note: "Araştırma, tasarım, teslim",
    col: 1,
    row: 0,
  },
  {
    id: "teknoloji",
    name: "TEKNOLOJİ",
    color: "#7b73c9",
    holds: ["Teknoloji", "Veri"],
    metric: "İncelemeler",
    note: "Prototip, veri, doğrulama",
    col: 2,
    row: 0,
  },
  {
    id: "finans",
    name: "FİNANS",
    color: "#6e9c74",
    holds: ["Finans"],
    metric: "Analizler",
    note: "Fiyat, birim ekonomi, kasa",
    col: 0,
    row: 1,
  },
  {
    id: "buyume",
    name: "BÜYÜME",
    color: "#5f9fae",
    holds: ["Büyüme", "Satış", "Müşteri", "Pazarlama"],
    metric: "Deneyler",
    note: "Erişim, teklif, dönüşüm",
    col: 1,
    row: 1,
  },
  {
    id: "operasyon",
    name: "OPERASYON",
    color: "#c5a259",
    holds: ["Operasyon", "Saha", "Hukuk", "İK"],
    metric: "Teslimler",
    note: "Süreç, kapasite, takip",
    col: 2,
    row: 1,
  },
];

const FALLBACK = "operasyon";
export const deptOf = (agent) => {
  const name = String(agent?.department || "").trim();
  const hit = DEPARTMENTS.find((d) => d.holds.includes(name));
  return hit ? hit.id : FALLBACK;
};

// Slab geometry. The floors are positioned by where they should land on the
// screen, then converted back into world coordinates, so the isometric angle
// never pushes two of them into the same corner. The middle is left empty for
// the shared memory, with the roads crossing underneath it.
const SLAB = 268;
const unProject = (sx, sy) => ({
  x: sy + sx / (2 * COS),
  y: sy - sx / (2 * COS),
});
const SCREEN_COL = [-745, 0, 745];
const SCREEN_ROW = [-320, 320];
const slabCentre = (dept) =>
  unProject(SCREEN_COL[dept.col], SCREEN_ROW[dept.row]);
const slabAt = (dept) => {
  const c = slabCentre(dept);
  return { x: c.x - SLAB / 2, y: c.y - SLAB / 2 };
};

// Desks sit as a centred block; a floor grows a row at a time as MESAI hires.
function deskSpots(count) {
  const spots = [];
  if (!count) return spots;
  const cols = count > 4 ? 3 : count > 1 ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const w = cols === 3 ? 62 : cols === 2 ? 86 : 104;
  const stepX = w + 16;
  const stepY = w + 34;
  const padX = (SLAB - (cols * stepX - 16)) / 2;
  const padY = (SLAB - (rows * stepY - 18)) / 2;
  for (let i = 0; i < count; i += 1) {
    spots.push({
      dx: padX + (i % cols) * stepX,
      dy: padY + Math.floor(i / cols) * stepY,
      w,
    });
  }
  return spots;
}

function Desk({ x, y, w = 84, working }) {
  const k = w / 84;
  const s = (n) => n * k;
  return (
    <g>
      {/* soft contact shadow so the desk sits on the floor, not above it */}
      <ellipse
        cx={iso(x + s(44), y + s(40))[0]}
        cy={iso(x + s(44), y + s(40))[1]}
        rx={s(56)}
        ry={s(28)}
        fill="rgba(0,0,0,.3)"
      />
      <Box x={x} y={y} w={s(84)} h={s(7)} d={s(42)} color="#d8b98a" z={s(29)} />
      <Box x={x + s(4)} y={y + s(4)} w={s(9)} h={s(29)} d={s(9)} color="#20232b" />
      <Box x={x + s(70)} y={y + s(29)} w={s(9)} h={s(29)} d={s(9)} color="#20232b" />
      <Box x={x + s(20)} y={y + s(4)} w={s(4)} h={s(13)} d={s(28)} color="#1a1d24" z={s(36)} />
      <Box x={x + s(17)} y={y + s(2)} w={s(3)} h={s(29)} d={s(34)} color="#f2efe4" z={s(49)} />
      {/* the person: chair, body, head */}
      <Box x={x + s(25)} y={y + s(57)} w={s(25)} h={s(19)} d={s(21)} color="#3c4a3e" />
      <Box x={x + s(27)} y={y + s(51)} w={s(21)} h={s(29)} d={s(17)} color="#a8bcd8" z={s(19)} />
      <ellipse
        cx={iso(x + s(37), y + s(60), s(56))[0]}
        cy={iso(x + s(37), y + s(60), s(56))[1]}
        rx={s(16)}
        ry={s(16)}
        fill="#3a2b22"
      />
      {working && (
        <circle
          className="ao-desk-live"
          cx={iso(x + s(17), y + s(2), s(82))[0]}
          cy={iso(x + s(17), y + s(2), s(82))[1]}
          r={s(7)}
          fill="#7fd6a0"
        />
      )}
    </g>
  );
}

// Dotted cables drop in from the top of the frame into each floor. They are the
// picture of the tools the shift actually runs on.
function Cables({ departments }) {
  const strands = [];
  departments.forEach((dept, i) => {
    const c = slabCentre(dept);
    for (let k = 0; k < 3; k += 1) {
      const end = iso(c.x - 40 + k * 40, c.y - 40 + k * 40, 16);
      const startX = -980 + i * 392 + (k - 1) * 58;
      const bend = (k - 1) * 210 + (i % 2 ? 90 : -90);
      strands.push({
        key: `${dept.id}-${k}`,
        d: `M ${startX} ${VIEW.y + 26} C ${startX + bend} ${VIEW.y + 430}, ${end[0] - bend} ${end[1] - 340}, ${end[0]} ${end[1]}`,
        colour:
          k === 1 && i % 2
            ? "rgba(214,120,102,.55)"
            : "rgba(238,236,228,.4)",
        end,
        delay: (i * 3 + k) * 0.28,
      });
    }
  });
  return (
    <g className="ao-cables">
      {strands.map((s) => (
        <path
          key={s.key}
          d={s.d}
          fill="none"
          stroke={s.colour}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 15"
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
      {strands.map((s) => (
        <circle
          key={`t-${s.key}`}
          cx={s.end[0]}
          cy={s.end[1]}
          r="4"
          fill="rgba(238,236,228,.5)"
        />
      ))}
    </g>
  );
}

function Brain({ notes }) {
  const spokes = useMemo(() => {
    const out = [];
    for (let i = 0; i < 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      const r = 30 + ((i * 41) % 66);
      out.push([Math.cos(a) * r * 1.6, Math.sin(a) * r * 0.8]);
    }
    return out;
  }, []);
  const c = iso(0, 0, 18);
  return (
    <g>
      <Box x={-98} y={-98} w={196} d={196} h={16} color="#2b2f38" />
      <g transform={`translate(${c[0]} ${c[1]})`} className="ao-brain">
        {spokes.map(([x, y], i) => (
          <line
            key={i}
            x1="0"
            y1="0"
            x2={x}
            y2={y}
            stroke="rgba(244,242,235,.62)"
            strokeWidth="1.2"
          />
        ))}
        {spokes.map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r="3" fill="#f7f5ee" />
        ))}
        <circle r="9" fill="#ffffff" />
        <circle r="22" fill="#ffffff" opacity="0.14" />
      </g>
    </g>
  );
}

function Roads() {
  return (
    <g>
      {DEPARTMENTS.map((dept) => {
        const c = slabCentre(dept);
        const a = iso(-42, -42, 2);
        const b = iso(42, 42, 2);
        const e1 = iso(c.x - 42, c.y - 42, 2);
        const e2 = iso(c.x + 42, c.y + 42, 2);
        return (
          <polygon
            key={dept.id}
            points={[a, e1, e2, b].map(pt).join(" ")}
            fill="rgba(122,126,136,.26)"
          />
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
export default function AgentsOffice({
  agents = [],
  tasks = [],
  artifacts = [],
  running = false,
  activeId = null,
  day = 0,
  openAgent,
  focus,
  setFocus,
}) {
  const stage = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const drag = useRef(null);
  // A pan that ends over a floor must not also open it, and the click arrives
  // after the pointer is already up, so the flag has to outlive the drag.
  const panned = useRef(false);

  const floors = useMemo(() => {
    const byId = new Map(DEPARTMENTS.map((d) => [d.id, []]));
    agents.forEach((agent) => byId.get(deptOf(agent)).push(agent));
    return DEPARTMENTS.map((dept) => {
      const team = byId.get(dept.id) || [];
      const ids = new Set(team.map((a) => a.id));
      const mine = tasks.filter((t) => ids.has(t.ownerId));
      return {
        ...dept,
        team,
        lead: team[0] || null,
        doing: mine.filter((t) => t.status === "in_progress").length,
        next: mine.filter((t) => t.status === "backlog").length,
        done: mine.filter((t) => t.status === "done").length,
        output: artifacts.filter((a) => ids.has(a.ownerId)).length,
        memory: team.reduce((n, a) => n + (a.memories?.length || 0), 0),
        live: running && team.some((a) => a.status === "working"),
      };
    });
  }, [agents, tasks, artifacts, running]);

  const notes = floors.reduce((n, f) => n + f.memory, 0);

  // Focusing a floor is just a camera move: centre it and come in closer.
  useEffect(() => {
    if (!focus) {
      setView({ scale: 1, x: 0, y: 0 });
      return;
    }
    const dept = DEPARTMENTS.find((d) => d.id === focus);
    if (!dept) return;
    const c = slabCentre(dept);
    const [sx, sy] = iso(c.x, c.y);
    const scale = 2.1;
    setView({
      scale,
      x: -(pctX(sx) - 50) * scale,
      y: -(pctY(sy) - 50) * scale,
    });
  }, [focus]);

  const zoom = useCallback((by) => {
    setView((v) => ({
      ...v,
      scale: Math.min(3.4, Math.max(0.62, +(v.scale + by).toFixed(2))),
    }));
  }, []);

  const onDown = (event) => {
    if (event.button !== 0) return;
    panned.current = false;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      ox: view.x,
      oy: view.y,
    };
  };
  const onMove = (event) => {
    const d = drag.current;
    if (!d || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    const dx = ((event.clientX - d.x) / box.width) * 100;
    const dy = ((event.clientY - d.y) / box.height) * 100;
    if (Math.abs(dx) + Math.abs(dy) > 0.4) panned.current = true;
    setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
  };
  const onUp = () => {
    drag.current = null;
  };

  const focused = focus ? floors.find((f) => f.id === focus) : null;

  return (
    <div className="ao-office">
      <div className={`ao-map ${focus ? "is-focused" : ""}`}>
      <div
        className="ao-stage"
        ref={stage}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <div
          className="ao-camera"
          style={{
            transform: `translate(${view.x}%, ${view.y}%) scale(${view.scale})`,
          }}
        >
          <svg
            className="ao-svg"
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            role="presentation"
          >
            <Cables departments={DEPARTMENTS} />
            <Roads />
            <Brain notes={notes} />
            {floors.map((floor) => {
              const s = slabAt(floor);
              const dim = focus && focus !== floor.id;
              return (
                <g
                  key={floor.id}
                  className={`ao-floor ${dim ? "is-dim" : ""} ${floor.live ? "is-live" : ""}`}
                  onClick={() =>
                    !panned.current &&
                    setFocus(focus === floor.id ? null : floor.id)
                  }
                >
                  <Box
                    x={s.x}
                    y={s.y}
                    w={SLAB}
                    d={SLAB}
                    h={16}
                    color={floor.color}
                  />
                  {deskSpots(floor.team.length).map((spot, i) => (
                    <Desk
                      key={floor.team[i].id}
                      x={s.x + spot.dx}
                      y={s.y + spot.dy}
                      w={spot.w}
                      working={running && floor.team[i].status === "working"}
                    />
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Pins ride with the camera but cancel its zoom, so a card is in the
              right place on the floor and still the same size to read. */}
          <div className="ao-pins" style={{ "--ao-inv": 1 / view.scale }}>
            {floors.map((floor) => {
              const s = slabAt(floor);
              const above = floor.row === 0;
              const [vx, vy] = above
                ? iso(s.x, s.y, 16)
                : iso(s.x + SLAB, s.y + SLAB, 0);
              const dim = Boolean(focus);
              return (
                <span
                  className="ao-pin"
                  key={floor.id}
                  style={{ left: `${pctX(vx)}%`, top: `${pctY(vy)}%` }}
                >
                  <button
                    className={`ao-card ${above ? "is-above" : "is-below"} ${dim ? "is-dim" : ""} ${focus === floor.id ? "is-open" : ""} ${floor.live ? "is-live" : ""}`}
                    style={{ "--dept": floor.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocus(focus === floor.id ? null : floor.id);
                    }}
                  >
                    <span className="ao-card-head">
                      <i className="ao-card-dot" />
                      {floor.name}
                      {floor.next > 0 && <u className="ao-card-alert" />}
                    </span>
                    <span className="ao-card-count">
                      <b>{floor.team.length}</b> KİŞİ
                    </span>
                    <span className="ao-card-rows">
                      <span>
                        {floor.metric.toLocaleUpperCase("tr-TR")}
                        <b>{floor.done}</b>
                      </span>
                      <span>
                        ÇIKTI<b>{floor.output}</b>
                      </span>
                    </span>
                    <span className="ao-card-foot">
                      <em>
                        AKTİF <b>{floor.doing}</b>
                      </em>
                      <em>
                        SIRA <b>{floor.next}</b>
                      </em>
                      <em>
                        BİTTİ <b>{floor.done}</b>
                      </em>
                    </span>
                  </button>
                </span>
              );
            })}

            <span
              className="ao-pin"
              style={{
                left: `${pctX(iso(0, 0, 26)[0])}%`,
                top: `${pctY(iso(0, 0, 26)[1])}%`,
              }}
            >
              <span className={`ao-brain-tag ${focus ? "is-dim" : ""}`}>
                <i /> ORTAK HAFIZA <b>{notes}</b> ÖĞRENİM
              </span>
            </span>

            {/* Name plates only make sense once the camera is close enough to
                read them, so they arrive with the focused floor. */}
            {focused &&
              deskSpots(focused.team.length).map((spot, i) => {
                const agent = focused.team[i];
                const s = slabAt(focused);
                const [vx, vy] = iso(
                  s.x + spot.dx + spot.w / 2,
                  s.y + spot.dy,
                  spot.w,
                );
                return (
                  <span
                    className="ao-pin"
                    key={agent.id}
                    style={{ left: `${pctX(vx)}%`, top: `${pctY(vy)}%` }}
                  >
                    <button
                      className={`ao-plate ${agent.id === activeId ? "is-active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAgent?.(agent);
                      }}
                    >
                      {i === 0 && <i className="ao-plate-star" />}
                      {agent.role.toLocaleUpperCase("tr-TR")}
                      <small>{agent.name}</small>
                    </button>
                  </span>
                );
              })}
          </div>
        </div>
      </div>

      <div className="ao-zoom">
        <button onClick={() => zoom(0.3)} aria-label="Yakınlaştır">
          +
        </button>
        <button onClick={() => zoom(-0.3)} aria-label="Uzaklaştır">
          −
        </button>
        <button
          onClick={() => {
            setFocus(null);
            setView({ scale: 1, x: 0, y: 0 });
          }}
          aria-label="Baştan görünüm"
          className="ao-zoom-home"
        >
          ⌂
        </button>
      </div>

        {focused && (
          <div className="ao-focus-bar">
            <button onClick={() => setFocus(null)}>◂ GENEL BAKIŞ</button>
            <span style={{ "--dept": focused.color }}>
              <i /> {focused.name}
            </span>
            <u>
              {focused.team.length} KİŞİ · AKTİF <b>{focused.doing}</b> · SIRA{" "}
              <b>{focused.next}</b> · BİTTİ <b>{focused.done}</b> · ÇIKTI{" "}
              <b>{focused.output}</b>
            </u>
            <em>{focused.note}</em>
          </div>
        )}

        {!agents.length && <p className="ao-empty">Ekip ofise yerleşiyor…</p>}
      </div>

      <div className="ao-legend">
        {floors.map((floor) => (
          <button
            key={floor.id}
            className={`ao-legend-item ${focus === floor.id ? "is-open" : ""}`}
            style={{ "--dept": floor.color }}
            onClick={() => setFocus(focus === floor.id ? null : floor.id)}
          >
            <span>
              <i /> {floor.name}
            </span>
            <b>{floor.team.length}</b>
            <em>
              AKTİF {floor.doing} · SIRA {floor.next} · BİTTİ {floor.done}
            </em>
          </button>
        ))}
      </div>
    </div>
  );
}
