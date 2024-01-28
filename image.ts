import {
  ColorSpace,
  ImageMagick,
  IMagickImage,
} from "https://deno.land/x/imagemagick_deno@0.0.26/mod.ts";
import { print } from "./logging.ts";

export class ImageQuantizer {
  constructor(
    private readonly colors = 16,
    private readonly ditherMethod = 3,
    private readonly colorSpace = ColorSpace.sRGB,
  ) {}

  quantize(image: IMagickImage) {
    print("Quantizing image...");
    const ptr = ImageMagick._api._QuantizeSettings_Create();
    try {
      ImageMagick._api._QuantizeSettings_SetColors(ptr, this.colors);
      ImageMagick._api._QuantizeSettings_SetColorSpace(ptr, this.colorSpace);
      ImageMagick._api._QuantizeSettings_SetDitherMethod(
        ptr,
        this.ditherMethod,
      );
      ImageMagick._api._MagickImage_Quantize(image._instance, ptr, 0);
    } finally {
      ImageMagick._api._QuantizeSettings_Dispose(ptr);
      print("Done!");
    }
  }
}
