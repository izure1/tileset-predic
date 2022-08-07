import fs from 'fs-extra'
import sharp from 'sharp'
import { PNG } from 'pngjs'
import { Matrix } from 'coord-matrix2d'

export class MatrixExtractor {
  private readonly __chunkWidth: number
  private readonly __chunkHeight: number

  constructor(chunkWidth: number, chunkHeight: number) {
    this.__chunkWidth = chunkWidth
    this.__chunkHeight = chunkHeight
  }

  /**
   * The blank image. It's png base64 data format string.
   */
  static readonly BlankImage = 'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' as string

  /**
   * The width of chunk image.
   */
  get chunkWidth(): number {
    return this.__chunkWidth
  }

  /**
   * The height of chunk image.
   */
  get chunkHeight(): number {
    return this.__chunkHeight
  }

  /**
   * Returns matrix that calculated with `chunkWidth`, `chunkHeight` from image as filled png base64 data format string.
   * @param imagePath The image path that exists.
   */
  async fromImage(imagePath: string): Promise<Matrix<string>> {
    return new Promise(async (resolve, reject) => {
      const buf = await fs.readFile(imagePath)
      const png = PNG.sync.read(buf)

      const { chunkWidth, chunkHeight } = this
      const row = Math.floor(png.height / chunkHeight)
      const col = Math.floor(png.width / chunkWidth)

      const matrix = new Matrix<string>(row, col, new Array(row * col).fill(''))
      
      try {
        const image = sharp(imagePath).png()

        for (let i = 0; i < row; i++) {
          for (let j = 0; j < col; j++) {
            const left  = j * chunkWidth
            const top   = i * chunkHeight

            const cropped   = await image.extract({ left, top, width: chunkWidth, height: chunkHeight }).toBuffer()
            const encoding  = cropped.toString('base64')

            matrix.setElement(i, j, encoding)
          }
        }

        resolve(matrix)
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Outputs image to file from matrix that filled png base64 format string.
   * @param distPath File to make.
   * @param matrix Image source matrix.
   */
  async asImage(distPath: string, matrix: Matrix<string>): Promise<void> {
    const { chunkWidth, chunkHeight } = this
    const { row, col }  = matrix
    const width         = chunkWidth * col
    const height        = chunkHeight * row

    const asComposite = (element: string, i: number) => {
      const top   = matrix.getRowIndex(i) * chunkHeight
      const left  = matrix.getColIndex(i) * chunkWidth
      const input = Buffer.from(element, 'base64')
      return {
        top,
        left,
        input
      }
    }

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).composite(matrix.elements.map(asComposite)).toFile(distPath)
  }
}