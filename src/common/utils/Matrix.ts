export class Matrix<T> {
  private readonly __row: number
  private readonly __col: number
  private readonly __size: number
  private readonly __elements: T[] = []

  constructor(row: number, col: number, elements: T[]) {
    const size = row * col

    if (size !== elements.length) {
      throw new Error(`The size of element expected ${size}, but got a ${elements.length}.`)
    }

    this.__elements = elements
    this.__row = row
    this.__col = col
    this.__size = size
  }

  /** The row size of matrix */
  get row(): number {
    return this.__row
  }

  /** The column size of matrix. */
  get col(): number {
    return this.__col
  }

  /** The elements length of matrix. */
  get size(): number {
    return this.__size
  }

  /** All of matrix's elements. */
  get elements(): T[] {
    return this.__elements
  }

  /**
   * Create matrix instance from 2d-array data type.
   * @param array Source of matrix elements as 2d-array data type.
   * @returns Matrix instance.
   */
  static From2DArray<T>(array: T[][]): Matrix<T> {
    const row = array.length
    if (!row) {
      throw new Error(`The size of array is should at least least 1.`)
    }

    const col = array[0].length
    const elements: T[] = []
    for (const list of array) {
      if (list.length !== col) {
        throw new Error(`The size of all rows in array are should be same size.`)
      }
      elements.push(...list)
    }

    return new Matrix(row, col, elements)
  }

  /**
   * Returns added result matrix between both matrix.
   * @param a The matrix.
   * @param b The matrix.
   */
  static Add(a: Matrix<number>, b: Matrix<number>): Matrix<number> {
    if (!Matrix.SizeMatch(a, b)) {
      throw Matrix.ERR_SIZE_NOT_MATCH()
    }
    return new Matrix(a.row, a.col, a.elements.map((av, i) => av + b.elements[i]))
  }

  /**
   * Returns subtracted result matrix between both matrix. It will returns `a - b`
   * @param a The matrix.
   * @param b The matrix.
   */
  static Sub(a: Matrix<number>, b: Matrix<number>): Matrix<number> {
    if (!Matrix.SizeMatch(a, b)) {
      throw Matrix.ERR_SIZE_NOT_MATCH()
    }
    return new Matrix(a.row, a.col, a.elements.map((av, i) => av - b.elements[i]))
  }

  /**
   * Returns whether the index has exceeded the range. Returns `true` if exceeded.
   * @param index The index number.
   * @param max Maximum index.
   * @param min Minimum index. Default value is `0`
   */
  static OutOfRange(index: number, max: number, min = 0): boolean {
    return index < min || index > max
  }

  /**
   * Returns whether the matrix has same size. It calculates with `row` and `col` properties.
   * @param a The matrix.
   * @param b The matrix.
   */
  static SizeMatch(a: Matrix<any>, b: Matrix<any>): boolean {
    return a.row === b.row && a.col === b.row
  }

  protected static ERR_EXCEED_RANGE(min: number, max: number, index: number): Error {
    return new Error(`The index exceeds the size of the matrix. The size should be between ${min} to ${max}, but got a ${index}`)
  }

  protected static ERR_SIZE_NOT_MATCH(): Error {
    return new Error(`The both matrixes are not match row, col size.`)
  }

  /**
   * Get new matrix from part of source matrix. It returns neighbor elements from point of coordinates of source matrix.
   * @param source The source matrix.
   * @param rowIndex Point of row index.
   * @param colIndex Point of column index.
   * @param row The matrix row size of result. Default value is `3`
   * @param col The matrix column size of result. Default value is `3`
   * @param fill Fill element if neighbor elements are out of range.
   */
  static GetLocalMatrix<T>(source: Matrix<T>, rowIndex: number, colIndex: number, row = 3, col = 3, fill: any = null): Matrix<T> {
    if (
      !(row%2) || !(col%2) ||
      row < 0 || col < 0
    ) {
      throw new Error(`The row and col parameter should be positive odd number.`)
    }

    const size = row * col
    const mat = new Matrix(row, col, new Array(size).fill(fill))

    const rowRadius = (row-1)/2
    const colRadius = (col-1)/2
    const startRowIndex = rowIndex - rowRadius
    const startColIndex = colIndex - colRadius

    for (let y = 0, i = 0; y < row; y++) {
      const rowOffset = startRowIndex + y
      if (Matrix.OutOfRange(rowOffset, source.row-1)) {
        i+=col
        continue
      }
      for (let x = 0; x < col; x++, i++) {
        const colOffset = startColIndex + x
        if (Matrix.OutOfRange(colOffset, source.col-1)) {
          continue
        }
        const element = source.getElement(rowOffset, colOffset)
        mat.elements[i] = element
      }
    }

    return mat
  }

  /**
   * Returns all elements in matrix's row vector as array.
   * @param index The matrix index of row.
   */
  getRowElements(index: number): T[] {
    if (Matrix.OutOfRange(index, this.row-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.row-1, index)
    }
    const start = index * this.col
    const end = start + this.col
    return this.elements.slice(start, end)
  }

  /**
   * Returns all elements in matrix's column vector as array.
   * @param index The matrix index of column.
   */
  getColElements(index: number): T[] {
    if (Matrix.OutOfRange(index, this.col-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.col-1, index)
    }
    const elements: T[] = []
    const start = index
    const step = this.col
    for (let i = start, len = this.elements.length; i < len; i += step) {
      const t = this.elements[i]
      elements.push(t)
    }
    return elements
  }

  /**
   * Get elements index of `matrix.elements` property with calculates row and column.
   * @param rowIndex The matrix index of row.
   * @param colIndex The matrix index of column.
   * @returns 
   */
  getIndex(rowIndex: number, colIndex: number): number {
    if (Matrix.OutOfRange(rowIndex, this.row-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.row-1, rowIndex)
    }
    if (Matrix.OutOfRange(colIndex, this.col-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.col-1, colIndex)
    }
    return (rowIndex * this.col) + colIndex
  }

  /**
   * Sets element for matrix.
   * @param rowIndex The matrix index of row.
   * @param colIndex The matrix index of column.
   * @param element The element what you want set.
   */
  setElement(rowIndex: number, colIndex: number, element: T): void {
    const index = this.getIndex(rowIndex, colIndex)
    this.elements[index] = element
  }

  /**
   * Returns row index of matrix from calculated with element index.
   * @param elOffset The index of `matrix.elements`
   */
  getRowIndex(elOffset: number): number {
    if (Matrix.OutOfRange(elOffset, this.elements.length-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.elements.length-1, elOffset)
    }
    return Math.floor(elOffset / this.col)
  }

  /**
   * Returns column index of matrix of calculated with element index.
   * @param elOffset The index of `matrix.elements`
   */
  getColIndex(elOffset: number): number {
    if (Matrix.OutOfRange(elOffset, this.elements.length-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.elements.length-1, elOffset)
    }
    return elOffset % this.col
  }

  /**
   * Returns element what you find in point of coordinates in matrix.
   * @param rowIndex The row index of matrix.
   * @param colIndex The column index of matrix.
   */
  getElement(rowIndex: number, colIndex: number): T {
    if (Matrix.OutOfRange(rowIndex, this.row-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.row-1, rowIndex)
    }
    if (Matrix.OutOfRange(colIndex, this.col-1)) {
      throw Matrix.ERR_EXCEED_RANGE(0, this.col-1, colIndex)
    }
    const index = this.getIndex(rowIndex, colIndex)
    return this.elements[index]
  }

  /**
   * Clear matrix elements.
   * @param fill The fill element.
   */
  clear(fill: T): this {
    this.elements.fill(fill)
    return this
  }

  /**
   * Returns all elements in matrix as 2d-array data type.
   */
  as2DArray(): T[][] {
    const array: T[][] = []
    for (let i = 0; i < this.row; i++) {
      const start = i * this.col
      const end = start + this.col
      const list = this.elements.slice(start, end)
      array.push(list)
    }
    return array
  }
}