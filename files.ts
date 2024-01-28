export class TextFileWriter {
  constructor(
    private readonly handle: Deno.FsFile,
    private readonly encoder = new TextEncoder(),
  ) {}

  write(str: string) {
    return this.handle.write(this.encoder.encode(str));
  }
}
