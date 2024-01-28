# Sigmasoldi3r's binary computer image

What? Yeah just a toy image format. Why? For fun only, and to use it in
ComputerCraft.

So? You can download binaries and use it as:

```
./sbci your_image.jpg -s=40
```

Then you'll have two images: `your_image-quantized.png` and `your_image.sbci`.

You can use the latter to draw it in ComputerCraft using the viewer.

> [!WARNING] Work is being done, the format is not ready!

The idea is that you'll have some sort of thumbnails and such embed inside of
each image, so your computer can render fast for all computer sizes, and you can
have previews or full resolution images.

Intended future embeddings:

- Original (Full target resolution)
- 0.2
- 0.4
- 0.8
- Thumbmnail 32x32
- Mini thumbnail 16x16
- Micro thumbnail 8x8

Those are meant to be drawn at the target's terminal full resolution.
