declare namespace Types {
  type PrimitiveType = string|number|null|boolean

  export interface Json {
    [key: string]: PrimitiveType|PrimitiveType[]|Json
  }
}