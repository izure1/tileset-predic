import { Matrix } from 'coord-matrix2d'
import { diffImages } from 'native-image-diff'
import { PNG } from 'pngjs'
import { compareTwoStrings } from 'string-similarity'
import { Relationship } from 'node-relation/dist/umd/raw'
import { RelationData } from 'node-relation/dist/common/raw/Relationship'

import { MatrixTransformer } from './MatrixTransformer'


type Element = string|number
type Clustering<T> = (originA: T, originB: T) => boolean|Promise<boolean>

export class MatrixDenser extends MatrixTransformer<Element> {
  private static readonly ImageCache = new Map<string, Buffer>()

  private static EnsureImage = (base64: string): Buffer => {
    if (!MatrixDenser.ImageCache.has(base64)) {
      const png = PNG.sync.read(Buffer.from(base64, 'base64'))
      MatrixDenser.ImageCache.set(base64, png.data)
    }
    return MatrixDenser.ImageCache.get(base64)!
  }

  /**
   * The function of calculate both string similarity.
   * @param similarityThreshold If both string similarity are bigger than `similarityThreshold`, The both strings will be treat as same element. This value should be `0` to `1`. Default value is `0.9`
   */
  static DenseString(similarityThreshold = 0.9): Clustering<string> {
    return (a, b) => compareTwoStrings(a, b) > similarityThreshold
  }

  /**
   * The function of calculate both image similarity. It must used for png base64 format string.
   * @param chunkImageWidth The both image width.
   * @param chunkImageHeight The both image height.
   * @param similarityThreshold If both string similarity are bigger than `similarityThreshold`, The both image will be treat as same element. This value should be `0` to `1`. Default value is `0.9`
   * @param sensitive Sets color sensitive. It will more sensitive when value high. The value should be `0` to `1`. Default value is `0.98`
   */
  static DenseImage(chunkImageWidth: number, chunkImageHeight: number, similarityThreshold = 0.9, sensitive = 0.98): Clustering<string> {
    const colorThreshold = 1-sensitive
    const pixel = chunkImageWidth * chunkImageHeight
    const width = chunkImageWidth
    const height = chunkImageHeight

    return (a, b) => {
      const aBuf = MatrixDenser.EnsureImage(a)
      const bBuf = MatrixDenser.EnsureImage(b)
      const mismatch = diffImages({
        image1: { width, height, data: aBuf },
        image2: { width, height, data: bBuf },
        colorThreshold
      }).pixels

      return (1 - (mismatch / pixel)) > similarityThreshold
    }
  }

  /**
   * Get unique identifier integer of both integers. It used for tuple data type.
   * @param a The integer.
   * @param b The integer.
   */
  protected static Pairing(a: number, b: number): number {
    const x = Math.min(a, b)
    const y = Math.max(a, b)
    return (((x+y) * (x+y+1)) / 2) + y
  }

  /**
   * Returns dense matrix to calculated with similarity function as 2d tuple array.
   * @param matrix The source matrix.
   * @param sameRule You can use `MatrixDenser.DenseImage`, `matrixDenser.DenseString`. You can pass custom function also if you want.
   * @param cache The result of calculated. It used for performance. If find cache already calculated, It will used cache instead.
   */
  async dense<T extends Element>(matrix: Matrix<T>, sameRule: Clustering<T>, cache = new Map<number, boolean>()): Promise<RelationData<T>[]> {
    const len = matrix.elements.length
    const state = new Relationship<T>()

    for (let x = 0; x < len; x++) {
      for (let y = x; y < len; y++) {
        const originA = matrix.elements[x]
        const originB = matrix.elements[y]

        const flagA   = this.ensureFlag(originA)
        const flagB   = this.ensureFlag(originB)
        const key     = MatrixDenser.Pairing(flagA, flagB)

        let isSame = false

        if (cache.has(key)) {
          isSame = cache.get(key)!
        }
        else {
          if (originA === originB)  isSame = true
          else                      isSame = await sameRule(originA, originB)

          cache.set(key, isSame)
        }

        if (isSame) {
          state.both(originA, originB)
        }
      }
    }

    return state.dataset
  }
}
