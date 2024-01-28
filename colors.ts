export class Color {
  constructor(readonly r: number, readonly g: number, readonly b: number) {}
  distance({ r, g, b }: Color) {
    return Math.sqrt(
      Math.pow(this.r - r, 2) + Math.pow(this.g - g, 2) +
        Math.pow(this.b - b, 2),
    );
  }
  toBin() {
    return this.r | this.g << 8 | this.b << 16;
  }
  toHex() {
    return `${this.r.toString(16).padStart(2, "0")}${
      this.g.toString(16).padStart(2, "0")
    }${this.b.toString(16).padStart(2, "0")}`;
  }
  eq(other: Color) {
    return this.r === other.r && this.g === other.g && this.b === other.b;
  }
}

/**
 * Does the translation by distance.
 */
export class PaletteBuilder {
  private readonly blitTable = new Map<Color, string>();
  constructor(readonly palette: Color[]) {
    for (let i = 0; i < palette.length; i++) {
      this.blitTable.set(palette[i], i.toString(16));
    }
  }
  nearest(color: Color): Color {
    let closest = this.palette[0];
    let smallestDistance = 9999;
    for (const compare of this.palette) {
      const distance = color.distance(compare);
      if (distance < smallestDistance) {
        closest = compare;
        smallestDistance = distance;
      }
    }
    return closest;
  }
  bySortedByDistanceTo(color: Color) {
    return this.palette.map((x) => ({ color: x, distance: x.distance(color) }))
      .sort((l, r) => l.distance - r.distance).map((s) => s.color);
  }
  getBlit(color: Color): string;
  getBlit(index: number): string;
  getBlit(color: Color | number): string {
    if (typeof color === "number") {
      return this.blitTable.get(this.palette[color]) ?? "";
    } else {
      return this.blitTable.get(this.palette[this.getIndex(color)]) ?? "";
    }
  }
  getIndex(color: Color): number {
    return this.palette.findIndex((c) => c === color || c.eq(color));
  }
}

export class PaletteCollector {
  constructor(private readonly collected: Record<string, Color> = {}) {}
  add(color: Color) {
    this.collected[color.toHex()] = color;
  }
  collect() {
    return [...Object.values(this.collected)];
  }
}
