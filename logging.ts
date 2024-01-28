export const print = console.log.bind(console);

export function toHex(n: number, cap: number): string {
  return n.toString(16).padStart(cap, "0");
}

export function colorToRgbHex(r: number, g: number, b: number): string {
  return `${toHex(r, 2)}${toHex(g, 2)}${toHex(b, 2)}`;
}
