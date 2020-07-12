import Path from '../Paths/Path'
import * as N3 from 'n3'
import { NameSpaces } from './NameSpaces'


export function addToMapList (map : Map<any, any>, key: any, value: any) {
  const val = map.get(key)
  if (val) val.push(value)
  else map.set(key, [value])
}

export function getIdOrValue (term : any) : string {
  return term.id || term.value
}

export interface FoundPath {path: Path[], pathEnd: N3.Term}

export interface Relation{
  '@context': string | object,
  '@type': string,
  'tree:path': any,
  'tree:value': any,
  'tree:node': string
}

export const defaultContext = {
  rdf: NameSpaces.RDF,
  tree: NameSpaces.TREE,
  shacl: NameSpaces.SHACL,
  xsd: NameSpaces.XSD
}
