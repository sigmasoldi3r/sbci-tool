import { ByteSet } from "https://doc.deno.land/https/deno.land/x/bytes/mod.ts";
import { print } from "../logging.ts";
import { Color, PaletteCollector } from "../colors.ts";

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
    print("Encoding palette...");
    const collector = new PaletteCollector();
    for (let j = 0; j < info.height; j++) {
      for (let i = 0; i < info.width; i++) {
        const [r, g, b] = data.getPixel(i, j);
        const color = new Color(r, g, b);
        collector.add(color);
      }
    }
    const blitByRgb: Record<string, number> = {};
    for (const [blit, color] of collector.collect().entries()) {
      await writer.write(cbt.writeColor(blit, color));
      blitByRgb[color.toHex()] = blit;
    }
    for (let j = 0; j < info.height; j++) {
      for (let i = 0; i < info.width; i++) {
        const [r, g, b] = data.getPixel(i, j);
        const color = new Color(r, g, b).toHex();
        output.write.uint8(blitByRgb[color]);
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
