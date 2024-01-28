import { ByteSet } from "https://doc.deno.land/https/deno.land/x/bytes/mod.ts";
import { colorToRgbHex, print } from "../logging.ts";
import { Color, PaletteBuilder, PaletteCollector } from "../colors.ts";

export enum SnfpMode {
  BINARY,
  ASCII,
}

export interface Rect {
  width: number;
  height: number;
}

export interface AbstractBitmap {
  getPixel(x: number, y: number): Uint8Array;
}

export type ImageInfo = Rect;

const ccPalette = new PaletteBuilder([
  new Color(240, 240, 240),
  new Color(242, 178, 51),
  new Color(229, 127, 216),
  new Color(153, 178, 242),
  new Color(222, 222, 108),
  new Color(127, 204, 25),
  new Color(242, 178, 204),
  new Color(76, 76, 76),
  new Color(153, 153, 153),
  new Color(76, 153, 178),
  new Color(178, 102, 229),
  new Color(51, 102, 204),
  new Color(127, 102, 76),
  new Color(87, 166, 78),
  new Color(204, 76, 76),
  new Color(17, 17, 17),
]);

export class ColorBinaryTransformer {
  constructor(private readonly byteSet = new ByteSet(4)) {}
  writeColor(i: number, color: Color) {
    this.byteSet.position = 0;
    this.byteSet.write.uint8(i);
    this.byteSet.write.uint8(color.r);
    this.byteSet.write.uint8(color.g);
    this.byteSet.write.uint8(color.b);
    return this.byteSet.buffer;
  }
}

export class SnfpWriter {
  constructor(readonly mode = SnfpMode.BINARY) {}

  async writeTo(
    target: WritableStream<Uint8Array>,
    info: ImageInfo,
    data: AbstractBitmap,
  ) {
    const writer = await target.getWriter();
    try {
      switch (this.mode) {
        case SnfpMode.BINARY:
          return await this.writeToBinary(writer, info, data);
        case SnfpMode.ASCII:
          return await this.writeToAscii(writer, info, data);
        default:
          throw new Error(
            `Mode not supported: ${Object.keys(SnfpMode)[this.mode]}`,
          );
      }
    } finally {
      writer.releaseLock();
    }
  }

  static async writeHeader(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    info: ImageInfo,
  ) {
    const header = new ByteSet(4 + 4 * 2);
    header.write.string("sbci");
    header.write.uint32(info.width);
    header.write.uint32(info.height);
    await writer.write(header.buffer);
  }

  private async writeToBinary(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    info: ImageInfo,
    data: AbstractBitmap,
  ) {
    print("Writting header...");
    print(`Image is ${info.width} x ${info.height}, collecting palette...`);
    await SnfpWriter.writeHeader(writer, info);
    const output = new ByteSet(info.width * info.height);
    const cbt = new ColorBinaryTransformer();
    const collector = new PaletteCollector();
    const bucket = new Map<number, Color[]>();
    // 1st stage: Collect the color space
    print("Collecting color space...");
    for (let i = 0; i < 16; i++) {
      bucket.set(i, []);
    }
    for (let j = 0; j < info.height; j++) {
      for (let i = 0; i < info.width; i++) {
        const [r, g, b] = data.getPixel(i, j);
        const color = new Color(r, g, b);
        collector.add(color);
      }
    }
    for (const color of collector.collect()) {
      const nearest = ccPalette.nearest(color);
      const blit = ccPalette.getIndex(nearest);
      const arr = bucket.get(blit)!;
      arr.push(color);
      bucket.set(blit, arr);
    }
    // 2nd stage: Apply the sorting algorithm.
    print("Distributting quantized color values...");
    for (const [blit, list] of bucket.entries()) {
      while (list.length > 1) {
        const top = list.pop()!;
        const c = ccPalette.bySortedByDistanceTo(top);
        for (const near of c) {
          const idx = ccPalette.getIndex(near);
          if (blit === idx) continue;
          const others = bucket.get(idx)!;
          if (others.length === 0) {
            others.push(top);
            break;
          }
        }
      }
    }
    // 3rd stage: encode palette
    print("Encoding palette...");
    const blitByRgb: Record<string, number> = {};
    for (const [blit, [color]] of bucket.entries()) {
      await writer.write(cbt.writeColor(blit, color));
      blitByRgb[color.toHex()] = blit;
    }
    print(bucket);
    // 4th stage: write the actual image buffer
    for (let j = 0; j < info.height; j++) {
      for (let i = 0; i < info.width; i++) {
        const [r, g, b] = data.getPixel(i, j);
        const color = new Color(r, g, b).toHex();
        output.write.uint8(blitByRgb[color] ?? 0);
      }
    }
    await writer.write(output.buffer);
  }

  // deno-lint-ignore require-await
  private async writeToAscii(
    // deno-lint-ignore no-unused-vars
    writer: WritableStreamDefaultWriter<Uint8Array>,
    // deno-lint-ignore no-unused-vars
    info: ImageInfo,
    // deno-lint-ignore no-unused-vars
    data: AbstractBitmap,
  ) {
    throw new Error("Not implemented yet");
  }
}
