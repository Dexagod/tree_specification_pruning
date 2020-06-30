import * as SPARQLJS from 'sparqljs'
import * as N3 from 'n3'
import Path from '../Paths/Path'
import PredicatePath from '../Paths/PredicatePath'
// import InversePath from '../Paths/InversePath'
import AlternatePath from '../Paths/AlternatePath'
// import ZeroOrOnePath from '../Paths/ZeroOrOnePath'
// import ZeroOrMorePath from '../Paths/ZeroOrMorePath'
// import OneOrMorePath from '../Paths/OneOrMorePath'
import SequencePath from '../Paths/SequencePath'
import PriorityBoolean from './PriorityBooolean'
import { JsonLdParser } from 'jsonld-streaming-parser'
import { match } from 'assert'

const { translate } = require('sparqlalgebrajs')

const rdf: string = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const tree: string = 'https://w3id.org/tree#'
const shacl: string = 'http://www.w3.org/ns/shacl#'

export const defaultContext = {
  rdf: rdf,
  tree: tree,
  shacl: shacl
}

export default class Converter {
  /**
   *
   * @param relation A relation object that can possibly be pruned during the traversal of a tree structure
   * @param query The SPARQL query based on which is decided if the relation can be pruned
   */
  static async canPruneRelation (relation: Relation, query: string) {
    // First we extract the data quads from the relation object.
    const promise = new Promise((resolve, reject) => {
      const myParser = new JsonLdParser()
      const quads : Array<N3.Quad> = []
      myParser
        .on('data', (quad: N3.Quad) => { console.log('adding', quad); quads.push(quad) })
        .on('end', () => resolve(quads))
        .on('error', () => reject(new Error('Could not parse relation data')))
      myParser.write(JSON.stringify(relation))
      myParser.end()
    })
    const quads : Array<N3.Quad> = await promise as Array<N3.Quad>
    // Extracting the tree:path from the relation quads.
    const foundpaths = this.convertQuadsToPath(quads)
    // A relation must have a path, if not we cannot prune the relation.
    if (!foundpaths || foundpaths.size !== 1) { throw new Error('No path found in relation') }
    // A relation only has a single path (might refactor later to only return the single path directly in the function)
    const path = Array.from(foundpaths.values())[0]
    // Now that the relation path is extracted, we process the query and try to match it with the relation.
    return this.matchSPARQLWithPath(query, path)
  }

  static convertQuadsToPath (quads: Array<N3.Quad>) : Map<string, Path> | null {
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
        case shacl + 'alternatePath':
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
        default:
          unusedIds.add(quad.subject.value)
      }
    }

    // rebuild the paths extracted from the data quads
    const resultPaths = new Map()
    for (const id of Array.from(paths.keys())) {
      const quad = paths.get(id)
      const path = buildPath(quad.object.value)
      resultPaths.set(id, path)
    }
    return resultPaths

    // inner function to recursively build paths from quads
    function buildPath (id: string) : Path[] | Path | string | null{
      // check for alternate path
      let quad : N3.Quad | undefined = combinedPaths.get(id)
      if (quad) {
        if (quad.predicate.value === shacl + 'alternatePath') {
          const p = buildPath(quad.object.value)
          if (p instanceof SequencePath) { return new AlternatePath(p.value) } else { throw new Error('Alternate path must contain multiple path possibilities.') }
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

  static matchSPARQLWithPath (sparqlQuery : string, path: Path) : Path | null{
    const sparqlJSON2 = translate(sparqlQuery)
    console.log('translatedquery', require('util').inspect(sparqlJSON2, false, null, true))

    const sparqlJSON = new SPARQLJS.Parser().parse(sparqlQuery)
    const jsonquery = sparqlJSON as SPARQLJS.Query
    console.log('jsonquery', jsonquery)
    if (jsonquery.queryType !== 'SELECT') { return null }
    if (!jsonquery.where) return null
    const variables = jsonquery.variables
    const patterns = []
    for (const pattern of jsonquery.where) {
      console.log('PATTERN')
      console.log(require('util').inspect(pattern, false, null, true))
      switch (pattern.type) {
        case 'bgp':
          patterns.push({ type: 'bgp', match: this.matchBGP(pattern, path) })
          break

        case 'filter':
          patterns.push({ type: 'filter', mappings: this.convertFilter(pattern as SPARQLJS.FilterPattern) })
          break

        default:
          break
      }
    }

    return null
  }

  static convertBGPtoPath (pattern : N3.Quad[]) {
    const subjectMap = new Map()
    const predicatePaths = new Map()
    const sequencePaths = new Map()
    const alternatePaths = new Map()
    for (const quad of pattern) {
      subjectMap.set(quad.subject.value || quad.subject.id, quad)
      const predicate : any = quad.predicate
      if (predicate.pathType) {
        switch (this.getPredicatePath(quad)) {
          case 'predicatePath':
            this.addToMapList(predicatePaths, quad.subject.id || quad.subject.value, quad)
            break
          case 'sequencePath':
            this.addToMapList(sequencePaths, quad.subject.id || quad.subject.value, quad)
            break
          case 'alternatePath':
            this.addToMapList(alternatePaths, quad.subject.id || quad.subject.value, quad)
            break
          default:
            break
        }
      } else {
        this.addToMapList(predicatePaths, quad.subject.value || quad.subject.id, quad)
      }
    }
  }

  static getPredicatePath (quad : any) {
    const predicatePath = quad.predicate
    if (predicatePath.type === 'path') {
      switch (predicatePath.pathType) {
        case '|':
          return 'alternatePath'
        case '/':
          return 'sequencePath'
        case '^':
          return 'inversePath'
        case '+':
          return 'oneOrMorePath'
        case '*':
          return 'zeroOrMorePath'
        case '!':
          console.error("'!' operator is not yet supported for tree path tracing")
          return 'predicatePath'
      }
    } else {
      return 'predicatePath'
    }
  }

  static getPredicateValue (triple : SPARQLJS.Triple) : SPARQLJS.Term[] {
    return this.getPredicateValueRecursive(triple.predicate)
  }

  private static getPredicateValueRecursive (predicate : SPARQLJS.PropertyPath | SPARQLJS.Term) : SPARQLJS.Term[] {
    if ((predicate as SPARQLJS.PropertyPath).type) {
      let items : SPARQLJS.Term[] = []
      for (const itemPredicate of (predicate as SPARQLJS.PropertyPath).items) {
        items = items.concat(this.getPredicateValueRecursive(itemPredicate))
      }
      return items
    } else {
      return [predicate as SPARQLJS.Term]
    }
  }

  /**
   *
   * @param bpg This object contains the data triples of the basic graph pattern in which we want to match the path parameter of a relation
   * @param path The path to match for this bgp.
   * @param subjectId The subject identifier used to match a triple of the BGP.
   */
  static matchBGP (bgp : SPARQLJS.BgpPattern, path : Path, subjectId? : string | undefined) : String | null {
    const subjectids = new Map<SPARQLJS.Term, SPARQLJS.Triple>()
    const predicatePaths = new Map<string, Array<SPARQLJS.Triple>>()
    for (const triple of bgp.triples) {
      console.log('TRIPLE', triple)
      this.addToMapList(subjectids, triple.subject, triple)
      this.addToMapList(predicatePaths, this.getPredicatePath(triple), triple)
    }
    // Process shacl predicate path
    if (path instanceof (PredicatePath)) {
      for (const quad of predicatePaths.get('predicatePath') || []) {
        const results = []
        const subject : any = quad.subject // todo: extract values in a better way
        const predicate : any = quad.predicate // todo: extract values in a better way
        const object : any = quad.object // todo: extract values in a better way
        if (!subjectId || (subject.id === subjectId || subject.value === subjectId)) {
          if (path.value as String === (predicate.id || predicate.value)) {
            results.push(object.id || object.value)
          }
        }
      }

      // Process shacl sequence path
      // TODO: Match with subsequent predicate paths also
    } else if (path instanceof (SequencePath)) {
      let matches = null
      for (const sequencePath of path.value) {
        matches = this.matchBGP(bgp, sequencePath)
        if (!matches) return null
      }
      // This will return the match of the last element in the sequence path
      return matches
    } else if (path instanceof (AlternatePath)) {
      for (const possiblePath of path.value) {
        const matches = this.matchBGP(bgp, possiblePath)
        if (matches) return matches
      }
      return null
    } else {
      throw new Error('Path type not yet supported')
    }

    return null
  }

  // static matchPaths (treePath : Path, subject : SPARQLJS.Term, subjectIds : Map<SPARQLJS.Term, Array<SPARQLJS.Triple>>) : any {
  //   const triples = subjectIds.get(subject)
  //   if (!triples) return new PriorityBoolean(false, false)
  //   for (const triple of triples) {
  //     if (treePath.getPathString() === this.getPredicatePath(triple)) { // Match the type of path
  //       // Now we match the content
  //       if (treePath instanceof PredicatePath && treePath.value as string === this.getPredicateValue(triple)[0]) {
  //         return triple.object
  //         // } else if ( treePath instanceof SequencePath ) {
  //         //   return this.matchPaths(treePath.value, subjectIds)

  //         // } else if ( Array.isArray(treePath.value) ) {
  //         //   let paths = treePath.value as Path[]
  //         //   for (let path in paths) {

  //       //   }
  //       } else {
  //         throw new Error('Came accross illegal value while matching paths')
  //       }
  //     } else {
  //       throw new Error('Not yet implemented UwU')
  //     }
  //   }
  // }

  static convertFilter (filter : any) {
    if (filter.expression) {
      switch (filter.expression.type) {
        case 'operation': {
          const operator = filter.expression.operator
          break
        }
        case 'operation2': {
          break
        }
      }
    }
  }

  static addToMapList (map : Map<any, any>, key: any, value: any) {
    const val = map.get(key)
    if (val) val.push(value)
    else map.set(key, [value])
  }

  static getSubjectIdString (subject: N3.Term) {
    // differentiate between blank nodes and non-blank nodes
    return subject.termType === 'BlankNode' ? '_:' + subject.value : subject.value
  }
}

export interface Relation{
  '@context': object,
  '@type': string,
  'tree:path': any,
  'tree:value': any,
  'tree:node': string
}
