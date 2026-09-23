/** Two 43 cm leg segments. Positive X is the direction the scientist faces. */
export function solveLeg(x: number, down: number) {
  const length = Math.min(0.859, Math.hypot(x, down));
  const bend =
    Math.PI -
    Math.acos(
      Math.max(
        -1,
        Math.min(1, (0.43 * 0.43 * 2 - length * length) / (0.43 * 0.43 * 2)),
      ),
    );
  const upper = Math.atan2(x, down) + bend / 2;
  return { upper, knee: -bend, foot: -upper + bend };
}
