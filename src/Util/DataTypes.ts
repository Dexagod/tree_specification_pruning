/* eslint-disable no-unused-vars */
export enum DataType {
  STRING = 'http://www.w3.org/2001/XMLSchema#string',
  DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal',
  INTEGER = 'http://www.w3.org/2001/XMLSchema#integer',
  FLOAT = 'http://www.w3.org/2001/XMLSchema#float',
  DOUBLE = 'http://www.w3.org/2001/XMLSchema#double',
  DATETIME = 'http://www.w3.org/2001/XMLSchema#dateTime',
  BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean',
  IRI = 'http://www.w3.org/2001/XMLSchema#anyURI',
  SIMPLELITERAL = 'http://www.w3.org/2001/XMLSchema#string',
}

const reverseMapping = new Map<string, DataType>([
  ['http://www.w3.org/2001/XMLSchema#string', DataType.STRING],
  ['http://www.w3.org/2001/XMLSchema#decimal', DataType.DECIMAL],
  ['http://www.w3.org/2001/XMLSchema#integer', DataType.INTEGER],
  ['http://www.w3.org/2001/XMLSchema#int', DataType.INTEGER], // Mapping for simplicity's sake
  ['http://www.w3.org/2001/XMLSchema#float', DataType.FLOAT],
  ['http://www.w3.org/2001/XMLSchema#double', DataType.DOUBLE],
  ['http://www.w3.org/2001/XMLSchema#dateTime', DataType.DATETIME],
  ['http://www.w3.org/2001/XMLSchema#boolean', DataType.BOOLEAN]
])

export function castDataType (typeString: string | undefined) : DataType | undefined {
  if (!typeString) return
  const dataType = reverseMapping.get(typeString)
  return dataType
}
