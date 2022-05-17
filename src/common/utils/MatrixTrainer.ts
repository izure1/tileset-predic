import { uniq } from 'lodash'
import { hash } from 'spark-md5'
import { shuffle } from 'shuffle-seed'
import { RelationData } from 'node-relation/dist/common/raw/Relationship'
import { Relationship } from 'node-relation/dist/umd/raw/index'

import { Matrix } from './Matrix'
import { MatrixTransformer } from './MatrixTransformer'


type Element = string|number
export type MatrixTrainerDataset = [[Element, number][], RelationData<number>[], RelationData<number>[], RelationData<number>[]]

interface MatrixGenerateOptions {
  /** Use cache? Default value is `true`. */
  useCache: boolean
  /**
   * Set behavior rule when if not found between both elements relationship when generating matrix.
   * You can use `quality` or `fill`. Default value is `quality`.  
   * The `quality` will stop generating matrix.  
   * The `fill` prioritizes filling matrix elements. Untrained parts may not allow elements to connect naturally.
   */
  mode: 'quality'|'fill'
}

interface MatrixGenerateResult<T> {
  /** */
  score: number
  result: Matrix<T>
}

class AdvancedRelationship<T> extends Relationship<T> {
  get relations() {
    return this.__relations
  }
}

export class MatrixTrainer extends MatrixTransformer<Element> {
  private __xn: AdvancedRelationship<number>
  private __yn: AdvancedRelationship<number>
  private __sim: AdvancedRelationship<number>

  private readonly DefAliasCache      = new Map<number, number[]>()
  private readonly DefSubElementCache = new Map<AdvancedRelationship<number>, Map<number, number[]>>()
  private readonly DefSubAliasCache   = new Map<AdvancedRelationship<number>, Map<number, number[]>>()

  constructor() {
    super()
    this.__xn   = new AdvancedRelationship<number>()
    this.__yn   = new AdvancedRelationship<number>()
    this.__sim  = new AdvancedRelationship<number>()
  }

  protected static readonly DefGenerateOptions: MatrixGenerateOptions = {
    useCache: true,
    mode: 'quality'
  }

  protected static UseCache(trainer: MatrixTrainer, useDefaultCache = true) {
    let aliasCache      = new Map<number, number[]>()
    let subElementCache = new Map<AdvancedRelationship<number>, Map<number, number[]>>()
    let subAliasCache   = new Map<AdvancedRelationship<number>, Map<number, number[]>>()

    if (useDefaultCache) {
      aliasCache      = trainer.DefAliasCache
      subElementCache = trainer.DefSubElementCache
      subAliasCache   = trainer.DefSubAliasCache
    }
  
    const aliases = (element: number): number[] => {
      if (!aliasCache.has(element)) {
        aliasCache.set(element, trainer.aliases(element))
      }
      return aliasCache.get(element)!
    }

    const nextElements = (relation: AdvancedRelationship<number>, element: number): number[] => {
      if (!subElementCache.has(relation)) {
        subElementCache.set(relation, new Map)
      }
      const cache = subElementCache.get(relation)!
      if (!cache.has(element)) {
        const subs = trainer.nextElements(relation, element)
        cache.set(element, subs)
      }
      return cache.get(element)!
    }
  
    const nextAliases = (relation: AdvancedRelationship<number>, element: number): number[] => {
      if (!subAliasCache.has(relation)) {
        subAliasCache.set(relation, new Map)
      }
      const cache = subAliasCache.get(relation)!
      if (!cache.has(element)) {
        const subs = trainer.nextAliases(relation, element)
        cache.set(element, subs)
      }
      return cache.get(element)!
    }
  
    return {
      aliases,
      nextElements,
      nextAliases
    }
  }

  /**
   * Returns random number from seed as between `0` to `1`. That will return always same number.
   * @param seed The seed.
   */
  protected static FixedRandom(seed: string|number): number {
    return parseInt(hash(seed.toString()), 16) / 3.402823669209385e+38 // Math.pow(2, 128)
  }

  /**
   * Returns random elements from array that calculated with seed. That will return always same element.
   * @param array The elements array.
   * @param seed The seed.
   */
  protected static Sample<T>(array: T[], seed: string|number): T|undefined {
    const random = MatrixTrainer.FixedRandom(seed)
    const index = Math.floor(array.length * random)
    return array[index]
  }

  /**
   * Returns savable training dataset. This data can be saving file.
   * @example
   * const data = trainer.dataset
   * const stringify = JSON.stringify(data)
   * 
   * fs.writeFile('your-file-path', stringify)
   */
  get dataset(): MatrixTrainerDataset {
    const flags = Array.from(this.__flags)
    const xn    = this.__xn.dataset
    const yn    = this.__yn.dataset
    const sim   = this.__sim.dataset

    return [flags, xn, yn, sim]
  }

  /**
   * Get similar elements with element. The similar elements are passed by `ally` method.
   * @param element Source element to find similar elements.
   */
  protected aliases(element: number): number[] {
    return [
      element,
      ...(this.__sim.relations.get(element) ?? [])
    ]
  }

  /**
   * Returns the candidate elements that may follow that element.
   * @param relation The elements relationship data.
   * @param element Find to element.
   */
  protected nextElements(relation: AdvancedRelationship<number>, element: number): number[] {
    const children = relation.relations.get(element) ?? []
    return uniq(children)
  }

  /**
   * Returns the candidate elements that may follow that element or similar.
   * @param relation The elements relationship data.
   * @param element Find to element.
   */
  protected nextAliases(relation: AdvancedRelationship<number>, element: number): number[] {
    const children: number[] = []
    for (const alias of this.aliases(element)) {
      const list = this.nextElements(relation, alias)
      children.push(...list)
    }
    return uniq(children.flatMap((v) => this.aliases(v)))
  }

  /**
   * Load and initial training dataset.
   * @param dataset 
   */
  load(dataset: MatrixTrainerDataset): void {
    const [flags, xn, yn, sim] = dataset
    this.__flags  = new Map(flags)
    this.__xn     = new AdvancedRelationship<number>(xn)
    this.__yn     = new AdvancedRelationship<number>(yn)
    this.__sim    = new AdvancedRelationship<number>(sim)
  }

  /**
   * Set similar elements as group.
   * @param aliases The similar elements.
   */
  ally(aliases: RelationData<Element>[]): this {
    const dataset = aliases.map((tuple) => {
      let key     = tuple[0]
      let values  = tuple[1]

      const rKey = this.ensureFlag(key)
      const rValues = values.map((v) => this.ensureFlag(v))

      return [rKey, rValues]
    }) as RelationData<number>[]

    this.__sim.merge(dataset)
    return this
  }

  /**
   * Train relationship between elements from matrix. Training dataset affected by `ally` method.
   * @param matrix The matrix what you want train.
   */
  train(matrix: Matrix<Element>): this {
    matrix.elements.forEach((element, i) => {
      const rowIndex = matrix.getRowIndex(i)
      const colIndex = matrix.getColIndex(i)

      element   = this.ensureFlag(element)

      if (!Matrix.OutOfRange(rowIndex-1, matrix.row-1)) {
        let top   = matrix.getElement(rowIndex-1, colIndex)
        top       = this.ensureFlag(top)

        this.__yn.to(top, element)
      }

      if (!Matrix.OutOfRange(colIndex-1, matrix.col-1)) {
        let left  = matrix.getElement(rowIndex, colIndex-1)
        left      = this.ensureFlag(left)

        this.__xn.to(left, element)
      }
    })

    return this
  }

  /**
   * Generate matrix as filled by trained dataset from seed. The same seed will return same shape of matrix.
   * @param row The row size of matrix what you want generate.
   * @param col The column size of matrix what you want generate.
   * @param ambient Default element in matrix if no found in training dataset.
   * @param seed The seed.
   * @param options 
   */
  generate<T extends Element>(row: number, col: number, ambient: T, seed: string|number = Math.random(), options: Partial<MatrixGenerateOptions> = {}): MatrixGenerateResult<T> {
    const { useCache, mode } = {
      ...MatrixTrainer.DefGenerateOptions,
      ...options
    }

    const size    = row * col
    const mat     = new Matrix<number>(row, col, new Array(size).fill(0))
    const all     = [
      ...this.__flags.values()
    ]
    const nodes   = uniq(all)
    
    
    const { nextAliases } = MatrixTrainer.UseCache(this, useCache)

    const hasTop    = (rowIndex: number) => !Matrix.OutOfRange(rowIndex-1, mat.row-1)

    const hasLeft   = (colIndex: number) => !Matrix.OutOfRange(colIndex-1, mat.col-1)

    
    let score = mat.size
    let subs = [
      ...nodes
    ]

    for (let i = 0, len = mat.elements.length; i < len; i++) {
      const rowIndex = mat.getRowIndex(i)
      const colIndex = mat.getColIndex(i)

      let element: number|undefined

      // 새로운 줄의 시작일 경우에만 동작합니다.
      // 윗 줄의 첫 타일의 y 관계에서 파생된 리스트로부터 첫 타일을 받아옵니다.
      if (colIndex === 0) {
        if (rowIndex > 0) {
          const beforeRowIndex  = rowIndex-1
          const beforeFirst     = mat.getElement(beforeRowIndex, 0)

          subs = [
            ...nextAliases(this.__yn, beforeFirst)
          ]
        }
      }

      subs = shuffle(subs, seed)

      for (const sub of subs) {
        const xAliases = nextAliases(this.__xn, sub)
        const yAliases = nextAliases(this.__yn, sub)

        if (!xAliases.length || !yAliases.length) {
          break
        }

        let xs: number[] = []
        let ys: number[] = []
        for (const x of xAliases) {
          xs.push(...nextAliases(this.__yn, x))
        }
        for (const y of yAliases) {
          ys.push(...nextAliases(this.__xn, y))
        }

        xs = uniq(xs)
        ys = uniq(ys)

        if (hasTop(rowIndex) && hasLeft(colIndex)) {
          const xConnectable = nextAliases(this.__xn, mat.getElement(rowIndex, colIndex-1)).includes(sub)
          const yConnectable = nextAliases(this.__yn, mat.getElement(rowIndex-1, colIndex)).includes(sub)

          // 상단과 좌측 요소와 연결되지 않는 노드라면 제외하고 다음 후보를 찾습니다.
          if (!xConnectable || !yConnectable) {
            continue
          }
        }

        if (hasTop(rowIndex) && hasLeft(colIndex+2)) {
          const nt = mat.getElement(rowIndex-1, colIndex+1)
          const nConnectable = nextAliases(this.__yn, nt).filter((v) => xAliases.includes(v))

          // 다음 요소를 생성할 수 없다면 제외하고 다음 후보를 찾습니다.
          if (!nConnectable.length) {
            continue
          }
        }

        element = sub
        subs = xAliases
      }

      // 더 이상 일치하는 타일 요소가 없을 경우 생성을 중단합니다.
      // 현재 인덱스로부터 완성도를 추론합니다.
      if (!element) {
        if (mode === 'quality') {
          score = i
          break
        }
        else if (mode === 'fill') {
          const localAliases = subs.length ? subs : nodes

          element = MatrixTrainer.Sample(localAliases, seed)!
          subs    = nextAliases(this.__xn, element)
        }
        else {
          throw new Error(`Unknown mode: '${mode}'`)
        }
      }

      mat.elements[i] = element!
    }

    return {
      score: score / mat.size,
      result: this.restore(mat, ambient) as Matrix<T>
    }
  }
}