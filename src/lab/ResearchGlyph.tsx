const paths: Record<string, string> = {
  heart: "M12 20 3 11C-1 4 8 1 12 7 16 1 25 4 21 11Z",
  lungs: "M11 3v8M13 3v8M9 7C4 7 2 14 3 20h7V9M15 7c5 0 7 7 6 13h-7V9",
  drop: "M12 2C9 8 4 12 4 16a8 8 0 0 0 16 0c0-4-5-8-8-14Z",
  cycle:
    "M4 8a8 8 0 0 1 14-3l3 3M21 3v5h-5M20 16A8 8 0 0 1 6 19l-3-3M3 21v-5h5",
  sun: "M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10",
  spring: "m5 2 14 3L5 8l14 3-14 3 14 3-14 3",
  infinity: "M12 12C3-2-5 24 12 12s25-14 0 0",
  wave: "M2 12h4l3-8 6 16 3-8h4",
  foot: "m9 3 5 1 1 9 6 4v4H3v-6l4-2Z",
  mountain: "m2 21 8-17 4 9 3-5 5 13ZM7 10l3 3 3-3",
  arrow: "M3 12h17M13 5l7 7-7 7",
  route: "M4 20V7a4 4 0 0 1 8 0v10a4 4 0 0 0 8 0V3M1 17l3 3 3-3M17 6l3-3 3 3",
  split: "M12 22V12L4 4M12 12l8-8M4 10V4h6M14 4h6v6",
  orbit: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 3l18 18M21 3 3 21",
  shoe: "M3 6h6l3 7 8 2 1 5H3ZM9 13l3-2M11 16l3-2",
  coat: "m8 3-6 5 3 5 3-2v10h9V11l3 2 3-5-7-5-4 4Z",
  pack: "M7 5V3h10v2M4 6h16v16H4ZM7 13h10v6H7ZM8 6v3M16 6v3",
  gear: "m9 2 6 0 1 4 4 1 2 5-3 3-1 5-6 2-3-3-5-1-2-6 3-3 0-4ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  bolt: "m13 2-9 12h7l-1 9 10-14h-8Z",
  flask: "M8 2h8M9 2v8L3 20v2h18v-2l-6-10V2M7 15h10",
  wind: "M2 7h14c7 0 7-6 2-6M2 12h18c5 0 5 6 0 6M2 17h8c6 0 6 6 0 6",
  flag: "M4 22V3M4 3h15l-3 5 3 5H4",
  magnet: "M3 3v10a9 9 0 0 0 18 0V3h-6v10a3 3 0 0 1-6 0V3ZM3 8h6M15 8h6",
  eye: "M1 12s10-16 22 0c-12 16-22 0-22 0ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  cloud: "M6 19a5 5 0 0 1-1-10 7 7 0 0 1 14 0 5 5 0 0 1-1 10Z",
  spark: "m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z",
  comet: "m21 2-9 6M22 6l-8 5M17 2l-6 6M8 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12",
  stone: "m8 3 10 2 4 8-7 9-10-3-3-9Z",
  weight: "M9 6a3 3 0 1 1 6 0M5 9h14l3 12H2Z",
  plane: "m2 3 21 8-10 3-4 9-2-10ZM7 13l16-2",
  feather: "M4 21 18 5M4 16C0 2 25-2 21 8c-3 9-9 10-17 8ZM10 15V9M15 10V5",
  hex: "m12 2 9 5v10l-9 5-9-5V7ZM7 9l5 3 5-3M12 12v6",
  fork: "M4 2v7l8 5 8-5V2M12 14v8M4 2l8 6 8-6",
  cannon: "M2 8 21 3l2 7-19 5ZM9 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  board:
    "M2 13h20M4 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4M20 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  cart: "M2 14h20l-3-7H7l-3 7M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  bike: "M5 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 17l5-10 9 10M7 7h6M10 7l3 10H5M17 4h3v13",
  car: "m3 12 3-7h12l3 7v8h-4v-3H7v3H3ZM3 12h18M6 14v1M18 14v1",
  snow: "M12 1v22M2 6l20 12M2 18 22 6M8 3l4 4 4-4M8 21l4-4 4 4",
  wheel: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 7v10M7 12h10",
  book: "M12 5C7 1 2 3 2 3v17s5-2 10 2c5-4 10-2 10-2V3s-5-2-10 2ZM12 5v17",
  tool: "M15 2a6 6 0 0 0-7 8l-7 9 4 4 9-9a6 6 0 0 0 8-7l-5 5-4-4Z",
};
export default function ResearchGlyph({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={paths[name] ?? paths.hex}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
