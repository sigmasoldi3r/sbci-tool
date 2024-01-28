import {
  IMagickImage,
  IPixelCollection,
} from "https://deno.land/x/imagemagick_deno@0.0.26/mod.ts";
import { TextFileWriter } from "../files.ts";

// WARNING Everything here is pretty much deprecated and useless, but it works fine for
// NFP files.

/** @deprecated See Color class in "colors.ts" */
export class Vector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
    readonly blit = "?",
  ) {}

  distance(other: Vector) {
    const { x, y, z } = this.minus(other);
    return Math.sqrt(x * x + y * y + z * z);
  }

  minus(other: Vector) {
    return new Vector(
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
    );
  }

  toString() {
    return `(${this.x} ${this.y} ${this.z})`;
  }
}

/** @deprecated */
const CC_PALETTE = [
  new Vector(240, 240, 240, "0"),
  new Vector(242, 178, 51, "1"),
  new Vector(229, 127, 216, "2"),
  new Vector(153, 178, 242, "3"),
  new Vector(222, 222, 108, "4"),
  new Vector(127, 204, 25, "5"),
  new Vector(242, 178, 204, "6"),
  new Vector(76, 76, 76, "7"),
  new Vector(153, 153, 153, "8"),
  new Vector(76, 153, 178, "9"),
  new Vector(178, 102, 229, "a"),
  new Vector(51, 102, 204, "b"),
  new Vector(127, 102, 76, "c"),
  new Vector(87, 166, 78, "d"),
  new Vector(204, 76, 76, "e"),
  new Vector(17, 17, 17, "f"),
];

/**
 * This method is the *old NFP translation method*, by
 * choosing the colors using their euclidean distance.
 */
export class PaletteTranslationMethod {
  constructor(
    private readonly writer: TextFileWriter,
    private readonly targetPalette = CC_PALETTE,
    private readonly palette: Record<string, Vector> = {},
  ) {}

  async build(pixels: IPixelCollection, image: IMagickImage) {
    const translationMap: Record<string, Vector> = {};
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const [r, g, b] = pixels.getPixel(x, y);
        // set.add(r | g << 8 | b << 16);
        const vec = new Vector(r, g, b);
        this.palette[vec.toString()] = vec;
      }
    }
    for (const [k, v] of Object.entries(this.palette)) {
      let lowest = -1;
      let current = new Vector(0, 0, 0);
      for (const color of Object.values(this.targetPalette)) {
        if (lowest === -1) {
          current = color;
          lowest = color.distance(v);
        } else {
          const dist = color.distance(v);
          if (lowest > dist) {
            current = color;
            lowest = dist;
          }
        }
      }
      translationMap[k] = current;
    }
    console.log(translationMap);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const [r, g, b] = pixels.getPixel(x, y);
        const vec = new Vector(r, g, b);
        const color = translationMap[vec.toString()];
        await this.writer.write(color.blit);
      }
      await this.writer.write("\n");
    }
  }
}
