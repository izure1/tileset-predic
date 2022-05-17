declare module 'image-clipper' {
  type ClipperCallback = (this: Clipper, ...args: any) => void
  export type ClipperSource = HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap

  export interface ClipperOption {
    canvas?: any
    quality?: number
    maxQuality?: number
    minQuality?: number
    bufsize?: number
  }

  export interface Clipper {
    image(path: string, callback: ClipperCallback): void
    image(source: ClipperSource): this
    crop(x: number, y: number, width: number, height: number): this
    toFile(path: string, callback: ClipperCallback): this
    toDataURL(quality?: number, callback: ClipperCallback): this
    quality(quality: number): this
    resize(width: number, height?: number): this
    clear(x: number, y: number, width: number, height: number): this
    reset(): this
    injectNodeCanvas(canvas: any): this
    getCanvas(): any
    configure(options: ClipperOption): this
  }

  function builder(path: string, options?: ClipperOption, callback: ClipperCallback): void
  function builder(source: ClipperSource, options?: ClipperOption): Clipper
  function builder(options: ClipperOption): Clipper

  export default builder
}