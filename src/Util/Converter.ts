import * as SPARQLJS from 'sparqljs'
import * as N3 from 'n3'
import Path from '../Paths/Path'
import PredicatePath from '../Paths/PredicatePath'
// import InversePath from '../Paths/InversePath'
import AlternativePath from '../Paths/AlternativePath'
// import ZeroOrOnePath from '../Paths/ZeroOrOnePath'
// import ZeroOrMorePath from '../Paths/ZeroOrMorePath'
// import OneOrMorePath from '../Paths/OneOrMorePath'
import SequencePath from '../Paths/SequencePath'
import PriorityBoolean from './PriorityBooolean'
import { JsonLdParser } from 'jsonld-streaming-parser'
import { match } from 'assert'
import { Relation, getIdOrValue } from './Util'

const rdf: string = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const tree: string = 'https://w3id.org/tree#'
const shacl: string = 'http://www.w3.org/ns/shacl#'

const DF = N3.DataFactory

export default class Converter {
  static async extractRelationPath (relation: Relation) : Promise<Path | null> {
    // First we extract the data quads from the relation object.
    const promise = new Promise((resolve, reject) => {
      const myParser = new JsonLdParser({ context: relation['@context'] || undefined })
      const quads : Array<N3.Quad> = []
      myParser
        .on('data', (quad: N3.Quad) => { quads.push(quad) })
        .on('end', () => resolve(quads))
        .on('error', () => reject(new Error('Could not parse relation data')))
      myParser.write(JSON.stringify(relation))
      myParser.end()
    })
    const quads : Array<N3.Quad> = await promise as Array<N3.Quad>
    // Extracting the tree:path from the relation quads.
    return this.convertSHACLQuadsToPath(quads)
  }

  static convertSHACLQuadsToPath (quads: Array<N3.Quad>) : Path | null {
    const paths = new Map()
    const unusedIds = new Set()
    const combinedPaths = new Map<string, N3.Quad>()
    const listHeads = new Map<string, N3.Quad>()
    const listTails = new Map<string, N3.Quad>()
    for (const quad of quads) {
      switch (quad.predicate.value) {
        case shacl + 'path':
          paths.set(quad.subject.value, quad)
          break
        case tree + 'path':
          paths.set(quad.subject.value, quad)
          break
        case shacl + 'alternativePath':
          combinedPaths.set(quad.subject.value, quad)
          break
        case rdf + 'first':
          listHeads.set(quad.subject.value, quad)
          break
        case rdf + 'rest':
          if (quad.object.value !== rdf + 'nil') {
            listTails.set(quad.subject.value, quad)
          }
          break
        case shacl + 'inversePath':
          throw new Error('cannot process inverse paths')

        case shacl + 'zeroOrOnePath':
          throw new Error('cannot process zero or one paths')

        case shacl + 'zeroOrMorePath':
          throw new Error('cannot process zero or more paths')

        case shacl + 'oneOrMorePath':
          throw new Error('cannot process one or more paths')
        default:
          // Receiving quads that we cannot process
          unusedIds.add(getIdOrValue(quad.subject))
          break
      }
    }

    // rebuild the paths extracted from the data quadsquad
    const id = Array.from(paths.keys())[0]
    if (!id) return null
    const quad = paths.get(id)
    const path = buildPath(quad.object.value) as (Path | null)
    return path

    // inner function to recursively build combined paths from quads
    function buildPath (id: string) : Path[] | Path | string | null{
      // check for alternate path
      let quad : N3.Quad | undefined = combinedPaths.get(id)
      if (quad) {
        shacl
        if (quad.predicate.value === shacl + 'alternativePath') {
          const p = buildPath(quad.object.value)
          if (p instanceof SequencePath) { return new AlternativePath(p.value) } else { throw new Error('Alternate path must contain multiple path possibilities.') }
        }
      }
      // check for sequence path
      quad = listHeads.get(id)
      let list : Array<Path> = []
      if (quad && quad.predicate.value === rdf + 'first') {
        let head = buildPath(quad.object.value)
        if (head instanceof String) head = new PredicatePath(head) // Cannot add string to sequencePath
        if (Array.isArray(head)) head = new SequencePath(head) // CAnnot add list, needs to be sequencePath
        if (head) list.push(head as Path)
      }
      quad = listTails.get(id)
      if (quad && quad.predicate.value === rdf + 'rest') {
        let tail = buildPath(quad.object.value)
        if (tail instanceof String) tail = new PredicatePath(tail) // Cannot add string to sequencePath
        if (tail instanceof SequencePath) tail = tail.value // If tail is a sequence path, concat the value and append it to the current sequencePath
        if (tail) list = list.concat(tail as Path[] | Path)
      }
      if (list.length > 0) { return new SequencePath(list) }

      // Check for predicate path
      if (!id || id === rdf + 'nil') { return null } else if (unusedIds.has(id)) { throw new Error('Path could not be parsed correctly') } else { return new PredicatePath(id) }
    }
  }
}
