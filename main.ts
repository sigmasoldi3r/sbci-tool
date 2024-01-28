import {
  ImageMagick,
  initialize,
} from "https://deno.land/x/imagemagick_deno@0.0.26/mod.ts";
import { parse } from "https://deno.land/std@0.207.0/flags/mod.ts";
import { ImageQuantizer } from "./image.ts";
import { TextFileWriter } from "./files.ts";
import { PaletteTranslationMethod } from "./formats/palette.ts";
import { SnfpMode, SnfpWriter } from "./formats/snfp.ts";
import { print } from "./logging.ts";

const { _: files, s, f, ascii, skip_quantized } = parse(Deno.args);
await initialize();

for (const file of files) {
  const data = await Deno.readFile(file.toString());
  await ImageMagick.read(data, async (image) => {
    if (s != null) {
      const ns = Number(s);
      await image.resize(ns, ns);
    } else {
      await image.resize(40, 40);
    }
    new ImageQuantizer().quantize(image);
    // Save the quantized image
    if (!skip_quantized) {
      await Deno.writeFile(
        file.toString().replace(/\.(.+?)$/, "-quantized.$1"),
        image.write((x) => x),
      );
    }
    const out = await Deno.create(
      file.toString().replace(/\.(.+?)$/, `.${f ?? "sbci"}`),
    );
    try {
      print("Getting image data...");
      await image.getPixels(async (pixels) => {
        if (f === "nfp") {
          print("Converting to nitrogen fingers paint format...");
          // OLD METHOD: Translate to nearest default palette
          const writer = new TextFileWriter(out);
          const paletteTranslationMethod = new PaletteTranslationMethod(writer);
          await paletteTranslationMethod.build(pixels, image);
        } else if (f === "sbci" || f == null) {
          print("Converting to sigmasoldi3r binary computer image...");
          // NEW METHOD: Use sigmasoldi3r's extended binary format
          const snfp = new SnfpWriter(ascii ? SnfpMode.ASCII : SnfpMode.BINARY);
          await snfp.writeTo(out.writable, image, pixels);
        } else {
          console.error(`Unknown format: ${f}`);
          Deno.exit(1);
        }
      });
    } finally {
      out.close();
    }
    print("Done!");
  });
}
