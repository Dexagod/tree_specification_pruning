import Path from '../Paths/Path'
import * as N3 from 'n3'
import { NameSpaces } from './NameSpaces'
import ValueRange from '../ValueRanges/ValueRange'
import StringValueRange from '../ValueRanges/StringValueRange'
import NumberValueRange from '../ValueRanges/NumberValueRange'

export function addToMapList (map : Map<any, any>, key: any, value: any) {
  const val = map.get(key)
  if (val) val.push(value)
  else map.set(key, [value])
}

export function getIdOrValue (term : any) : string {
  return term.id || term.value
}

export function getNextNonPrefixString (prefix: string) : string | null {
  if (!prefix) return null
  const lastLetter = prefix.substring(prefix.length - 1, prefix.length)
  if (lastLetter === 'z' || lastLetter === 'Z') {
    return getNextNonPrefixString(prefix.substring(0, prefix.length - 1))
  }
  return prefix.substring(0, prefix.length - 1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)
}

export function isValidValueRange (valueRange : ValueRange) {
  if (valueRange instanceof StringValueRange) {
    return !valueRange.start || !valueRange.end || valueRange.start.localeCompare(valueRange.end) <= 0
  } else if (valueRange instanceof NumberValueRange) {
    return !valueRange.start || !valueRange.end || valueRange.start <= valueRange.end
  } else {
    return null
  }
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
