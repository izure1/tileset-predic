import path from 'path'
import fs from 'fs-extra'
import { PNG } from 'pngjs'

import { MatrixDenser } from '../MatrixDenser'
import { MatrixTrainer, MatrixTrainerDataset } from '../MatrixTrainer'
import { MatrixExtractor } from '../MatrixExtractor'


jest.setTimeout(20000000)

describe('Trainer.test.ts', () => {
  let denser: MatrixDenser
  let trainer: MatrixTrainer
  let extractor: MatrixExtractor

  const datasetPath   = path.resolve(__dirname, 'dataset.json')
  const chunkWidth    = 32
  const chunkHeight   = 32

  beforeEach(() => {
    denser = new MatrixDenser()
    trainer = new MatrixTrainer()
    extractor = new MatrixExtractor(chunkWidth, chunkHeight)
  })

  test('Trainer.train', async () => {
    let dataset: MatrixTrainerDataset = [[], [], [], []]
    if (fs.existsSync(datasetPath)) {
      dataset = await fs.readJSON(datasetPath)
      trainer.load(dataset)
    }

    const src     = path.resolve(__dirname, 'sources')
    const images  = fs.readdirSync(src).map((v) => path.resolve(src, v))

    const cache     = new Map<number, boolean>()
    for (const image of images) {
      const data    = await extractor.fromImage(image)
      const aliases = await denser.dense(data, MatrixDenser.DenseImage(chunkWidth, chunkHeight), cache)

      trainer.ally(aliases).train(data)
    }

    await fs.writeJson(datasetPath, trainer.dataset)

    for (const [t, key] of trainer.flags) {
      const data = PNG.sync.read(Buffer.from(t as string, 'base64'))
      const buf = PNG.sync.write(data, { colorType: 6 })
      await fs.writeFile(path.resolve(__dirname, 'tilesets', `${key}.png`), buf)
    }

    console.log('done')
  })

  test('Trainer.generate', async () => {
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`The dataset is non-exists in '${datasetPath}'.`)
    }

    const dataset = await fs.readJson(datasetPath) as MatrixTrainerDataset
    const len = 10
    
    trainer.load(dataset)

    for (let i = 0; i < len; i++) {
      const dist = path.resolve(__dirname, `tileset_dist_${i}.png`)
      
      const start   = Date.now()
      const result  = trainer.generate(30, 30, MatrixExtractor.BlankImage, i, { mode: 'quality' })
      const end     = Date.now()

      await extractor.asImage(dist, result.result)

      console.log(`File_${i} Result:   score: ${result.score}   performance: ${end-start}ms`)
    }
  })
})