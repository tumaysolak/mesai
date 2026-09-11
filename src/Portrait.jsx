const PALETTE = [
  "#dbebc5",
  "#e1daf0",
  "#f0d1bb",
  "#c6dfe5",
  "#f1e4b8",
  "#cfdacf",
  "#e9cad0",
  "#c7d4ef",
];
const SHIRTS = [
  "#637f50",
  "#8873a5",
  "#bc7458",
  "#4e7c86",
  "#b0964e",
  "#526c5a",
  "#aa6576",
  "#677bab",
];
const SKIN = [
  "#e4b087",
  "#a96745",
  "#e6b994",
  "#c28660",
  "#e9c2a0",
  "#bd805a",
  "#eac0a1",
  "#d19d72",
];
const HAIR = [
  "#332b27",
  "#272527",
  "#443027",
  "#2c2825",
  "#6a4732",
  "#39312e",
  "#41332c",
  "#3d322a",
];

// Every persona carries its own look and hair; the name hash below is only a
// fallback for records written before looks were assigned. Hashing names alone
// collided: three of the eight founders drew the exact same face.
export default function Portrait({ agent, index = 0, className = "", size = 48 }) {
  const fallback = agent?.name
    ? [...agent.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 8
    : index % 8;
  const look = Number.isInteger(agent?.look)
    ? ((agent.look % 8) + 8) % 8
    : fallback;
  const long =
    typeof agent?.feminine === "boolean" ? agent.feminine : look % 3 === 1;
  const skin = SKIN[look],
    hair = HAIR[look],
    glasses = look === 0 || look === 3 || look === 5;
  return (
    <svg
      className={`portrait ${className}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={agent?.name || "\u00c7al\u0131\u015fan"}
    >
      <rect width="80" height="80" rx="24" fill={PALETTE[look]} />
      {long && <path d="M17 49V27c0-22 45-24 46 0v30H18Z" fill={hair} />}
      <path d="M12 80V68c2-12 16-17 28-17s26 5 28 17v12" fill={SHIRTS[look]} />
      <path d="M33 48h14v14c-4 6-10 6-14 0Z" fill={skin} />
      <path d="M32 52h16v5c-5 5-11 5-16 0" fill="#000" opacity=".08" />
      <ellipse cx="23" cy="37" rx="4" ry="6" fill={skin} />
      <ellipse cx="57" cy="37" rx="4" ry="6" fill={skin} />
      <rect x="23" y="16" width="34" height="40" rx="16" fill={skin} />
      {long ? (
        <path d="M22 31C21 7 57 5 59 30L48 19c-5 9-15 10-26 12Z" fill={hair} />
      ) : look % 2 === 0 ? (
        <path
          d="M22 32c-4-16 6-25 20-25 14 0 20 12 15 25l-6-13-10 7-11-3-7 12Z"
          fill={hair}
        />
      ) : (
        <path d="M22 31V19C20 5 58 5 58 21v12l-6-13-24 3-6 11Z" fill={hair} />
      )}
      <path
        d="M30 34h5m10 0h5"
        stroke={hair}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="32" cy="38" r="1.5" fill="#352d29" />
      <circle cx="48" cy="38" r="1.5" fill="#352d29" />
      <path
        d="m40 38-1 6h3"
        stroke="#a87452"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M35 48q5 4 10 0"
        stroke="#874e3f"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {glasses && (
        <g fill="none" stroke="#423b36" strokeWidth="1.4">
          <rect x="25.5" y="33.5" width="12" height="9" rx="3.5" />
          <rect x="42.5" y="33.5" width="12" height="9" rx="3.5" />
          <path d="M38 37h4" />
        </g>
      )}
      {long && (
        <path
          d="M25 42q2 19 15 17 14-1 15-17l-5 8-10 3-10-3Z"
          fill={hair}
          opacity=".65"
        />
      )}
      <path
        d="m29 61 11 8 11-8"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
