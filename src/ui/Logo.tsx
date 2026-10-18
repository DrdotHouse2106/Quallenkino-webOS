/** Quallenkino-Zeichen (Qualle mit Play-Symbol), wie das Symbol der Android-App. */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" aria-hidden="true">
      <defs>
        <linearGradient id="qk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7F76D6" />
          <stop offset="1" stop-color="#2E96E0" />
        </linearGradient>
      </defs>
      <rect width="108" height="108" rx="24" fill="url(#qk-bg)" />
      <g transform="translate(54 58) scale(0.78) translate(-54 -58)" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round">
        <path
          fill="#fff"
          stroke="none"
          fill-rule="evenodd"
          d="M28,58 C28,38 40,26 54,26 C68,26 80,38 80,58 C76,61.5 72,61.5 67.5,58 C63,61.5 58.5,61.5 54,58 C49.5,61.5 45,61.5 40.5,58 C36,61.5 32,61.5 28,58 Z M48.5,35 L48.5,51 L61.5,43 Z"
        />
        <path d="M35.5,63 C32.5,69 38.5,73 35.5,79 C32.5,85 37.5,87 35.5,91" />
        <path d="M47,63 C44,70 50,75 47,82" />
        <path d="M61,63 C64,70 58,75 61,82" />
        <path d="M72.5,63 C75.5,69 69.5,73 72.5,79 C75.5,85 70.5,87 72.5,91" />
      </g>
    </svg>
  )
}
