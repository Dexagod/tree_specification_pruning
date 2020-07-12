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

const { translate } = require('sparqlalgebrajs')

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

  // static async matchesPath (relation: Relation, query: string) {
  //   // First we extract the data quads from the relation object.
  //   const promise = new Promise((resolve, reject) => {
  //     const myParser = new JsonLdParser({ context: relation['@context'] || undefined })
  //     const quads : Array<N3.Quad> = []
  //     myParser
  //       .on('data', (quad: N3.Quad) => { quads.push(quad) })
  //       .on('end', () => resolve(quads))
  //       .on('error', () => reject(new Error('Could not parse relation data')))
  //     myParser.write(JSON.stringify(relation))
  //     myParser.end()
  //   })
  //   const quads : Array<N3.Quad> = await promise as Array<N3.Quad>
  //   // Extracting the tree:path from the relation quads.
  //   const foundpath = this.convertSHACLQuadsToPath(quads)
  //   // A relation must have a path, if not we cannot prune the relation.
  //   if (!foundpath) { throw new Error('No path found in relation') }
  //   // Now that the relation path is extracted, we process the query and try to match it with the relation.
  //   const result = this.matchSPARQLPathWithSHACLPath(query, foundpath)
  //   return result
  // }

  // static matchSPARQLPathWithSHACLPath (sparqlQuery : string, path: Path) {
  //   // translate the string query into json format
  //   const sparqlJSON = new SPARQLJS.Parser().parse(sparqlQuery)
  //   const jsonquery = sparqlJSON as SPARQLJS.Query

  //   // We currently only support pruning for select queries with a where clause
  //   if (jsonquery.queryType !== 'SELECT') { return null }
  //   if (!jsonquery.where) return null

  //   const patterns = []
  //   for (const pattern of jsonquery.where) {
  //     switch (pattern.type) {
  //       case 'bgp':

  //         // Quick and dirty solution temporary.
  //         // For all path matches (alternative paths with three possibilities are seen as three matches) is checked if all the query paths are used.
  //         // If this is not the case, there is a path in the query that was not set in the shacl path of the relation, meaning the matched paths are incorrect / incomplete
  //         var pathsPerType = this.extractBGPPaths(pattern.triples as unknown as N3.Quad[])[1]
  //         var foundBGPMatches = this.matchBGP(pathsPerType, path)

  //         var usedPaths : Path[] = []
  //         var fullMatch = true
  //         for (const match of foundBGPMatches || []) {
  //           usedPaths = usedPaths.concat(match.path)
  //         }
  //         for (const path of pathsPerType.get('alternativePath') || []) {
  //           if (usedPaths.indexOf(path) === -1) {
  //             fullMatch = false
  //           }
  //         }
  //         for (const path of pathsPerType.get('predicatePath') || []) {
  //           if (usedPaths.indexOf(path) === -1) {
  //             fullMatch = false
  //           }
  //         }
  //         if (!fullMatch) {
  //           throw new Error('No complete matching path was found for the given query')
  //         }

  //         var pathEnds = foundBGPMatches?.map(e => e.pathEnd)
  //         var uniquePathEnds = []
  //         for (const pathEnd of pathEnds || []) {
  //           let found = false
  //           for (const uniquePathEnd of uniquePathEnds) {
  //             if (getIdOrValue(pathEnd) === getIdOrValue(uniquePathEnd)) {
  //               found = true
  //               break
  //             }
  //           }
  //           if (!found) uniquePathEnds.push(pathEnd)
  //         }
  //         patterns.push({ type: 'bgp', match: uniquePathEnds })
  //         break

  //       case 'filter':
  //         // patterns.push({ type: 'filter', mappings: this.convertFilter(pattern as SPARQLJS.FilterPattern) })
  //         break

  //       default:
  //         break
  //     }
  //   }

  //   return patterns
  // }

  // static getIdOrValue (term : any) : string {
  //   return term.id || term.value
  // }

  // static getPredicateValue (triple : SPARQLJS.Triple) : SPARQLJS.Term[] {
  //   return this.getPredicateValueRecursive(triple.predicate)
  // }

  // private static getPredicateValueRecursive (predicate : SPARQLJS.PropertyPath | SPARQLJS.Term) : SPARQLJS.Term[] {
  //   if ((predicate as SPARQLJS.PropertyPath).type) {
  //     let items : SPARQLJS.Term[] = []
  //     for (const itemPredicate of (predicate as SPARQLJS.PropertyPath).items) {
  //       items = items.concat(this.getPredicateValueRecursive(itemPredicate))
  //     }
  //     return items
  //   } else {
  //     return [predicate as SPARQLJS.Term]
  //   }
  // }

  // static getSubjectIdString (subject: N3.Term) {
  //   // differentiate between blank nodes and non-blank nodes
  //   return subject.termType === 'BlankNode' ? '_:' + subject.value : subject.value
  // }

  // static mergeResults (res1: N3.Term[], res2: N3.Term[]) :N3.Term[] {
  //   const result = [...res1]
  //   const ids = result.map(e => this.getIdOrValue(e))
  //   for (const res of res2) {
  //     if (ids.indexOf(this.getIdOrValue(res)) === -1) { result.push(res) }
  //   }
  //   return result
  // }
}
