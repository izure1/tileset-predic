import { Matrix } from 'coord-matrix2d'

export type MatrixTransformerKey = string|number

export class MatrixTransformer<T extends MatrixTransformerKey> {
  protected __flags: Map<T, number>

  constructor(flags: [T, number][] = []) {
    this.__flags = new Map(flags)
  }

  /**
   * Returns all flags in instance. The first flag is `1`.
   */
  get flags(): [T, number][] {
    return Array.from(this.__flags)
  }

  /**
   * Returns flag from key. If the flag is not exists, it will be created.
   * @param key The key of flag.
   */
  ensureFlag(key: T): number {
    if (!this.__flags.has(key)) {
      this.__flags.set(key, this.__flags.size+1)
    }
    return this.__flags.get(key)!
  }
  
  /**
   * Returns flag from key. If the flag is not exists, it returns `undefined`.
   * @param key The key of flag.
   */
  getFlag(key: T): number|undefined {
    return this.__flags.get(key)
  }

  /**
   * Returns whether the flag has created in instance.
   * @param flag The key of flag what you find.
   */
  hasKey(flag: number): boolean {
    for (const value of this.__flags.values()) {
      if (value === flag) return true
    }
    return false
  }

  /**
   * Returns a key of flag.
   * @param flag The key of flag what you find.
   */
  getKey(flag: number): T|undefined {
    for (const [key, value] of this.__flags) {
      if (value === flag) return key
    }
  }

  /**
   * Returns matrix that elements filled by flag. The each elements should be a key of flag.  
   * If a flag not found in instance, that will be fill to `0`.
   * @param matrix The source matrix.
   */
  embedding(matrix: Matrix<T>): Matrix<number> {
    const { row, col, elements } = matrix

    const mat = new Matrix<number>(row, col, new Array(elements.length).fill(0))
    
    for (let i = 0, len = elements.length; i < len; i++) {
      const element = matrix.elements[i]
      const flag = this.ensureFlag(element)
      mat.elements[i] = flag
    }

    return mat
  }

  /**
   * Returns restored matrix from embedding matrix. The each elements should be a flag.
   * @param matrix The embedding matrix.
   * @param nonExistsFill If a flag not found in instance, that will be fill to this value.
   */
  restore(matrix: Matrix<number>, nonExistsFill: any = 0): Matrix<T> {
    const { row, col, elements } = matrix
    const mat = new Matrix<T>(row, col, elements as any)

    elements.forEach((element, i) => {
      if (!this.hasKey(element)) {
        mat.elements[i] = nonExistsFill
      }
      else {
        const key = this.getKey(element)!
        mat.elements[i] = key
      }
    })

    return mat
  }
}