import { addToMapList, getIdOrValue, FoundPath } from './Util'
import AlternativePath from '../Paths/AlternativePath'
import SequencePath from '../Paths/SequencePath'
import PredicatePath from '../Paths/PredicatePath'
import * as N3 from 'n3'
import Path from '../Paths/Path'
import ProcessedPattern from './ProcessedPattern'
import VariableBinding from '../Bindings/VariableBinding'
import { bindVariableToTerm } from './Operations'

export class BGPEvaluator {
  /**
   * Extract all paths in the BGP, and convert all path types to the predicate paths they contain.
   * @param pattern: Array<Quad>
   */
  static extractPathsFromBGP (pattern : N3.Quad[]) : Map<string, PredicatePath[]> {
    const subjectMap = new Map<string, PredicatePath[]>()
    let indexCounter = 0

    const newBlankNodeId = function () { return 'sequencePathVariable' + (indexCounter++) }
    for (const quad of pattern) {
      // subjectMap.set(quad.subject.value || quad.subject.id, quad)
      const predicate : any = quad.predicate
      if (predicate.pathType) {
        switch (this.getPath(quad)) {
          case 'predicatePath':
            addToMapList(subjectMap, getIdOrValue(quad.subject), new PredicatePath(getIdOrValue(quad.predicate), quad.subject, quad.object))
            break
          case 'sequencePath':
            var currentBlankNode
            var nextBlankNode
            // We expect the length of a sequence path to be at least 2.
            // The sequence path is split up in all individual paths, with blank nodes in between
            for (const [i, v] of predicate.items.entries()) {
              if (i === 0) {
                nextBlankNode = N3.DataFactory.blankNode(newBlankNodeId())
                addToMapList(subjectMap, getIdOrValue(quad.subject), new PredicatePath(getIdOrValue(v), quad.subject, nextBlankNode))
              } else if (i === predicate.items.length - 1) {
                addToMapList(subjectMap, getIdOrValue(nextBlankNode), new PredicatePath(getIdOrValue(v), nextBlankNode, quad.object))
              } else {
                currentBlankNode = nextBlankNode
                nextBlankNode = N3.DataFactory.blankNode(newBlankNodeId())
                addToMapList(subjectMap, getIdOrValue(currentBlankNode), new PredicatePath(getIdOrValue(v), currentBlankNode, nextBlankNode))
              }
            }
            break
          case 'alternativePath':
            for (const childPath of predicate.items) {
              // We create predicate path entries for the individual possible paths of the alternativePath
              addToMapList(subjectMap, getIdOrValue(quad.subject), new PredicatePath(getIdOrValue(childPath), quad.subject, quad.object))
            }
            break
          case 'inversePath':
            addToMapList(subjectMap, getIdOrValue(quad.object), new PredicatePath(getIdOrValue(quad.predicate), quad.object, quad.subject))
            break
          default:
            throw new Error(predicate.pathType + ' is currently not implemented.')
        }
      } else {
        // If no path is specified, we handle the Term as a predicatePath
        addToMapList(subjectMap, getIdOrValue(quad.subject), new PredicatePath(getIdOrValue(quad.predicate), quad.subject, quad.object))
      }
    }
    return subjectMap
  }

  /**
   *
   * @param BGPpaths Possible paths in BGP
   * @param RelationPath Searched path
   */
  static findMatchingBGPPaths (bgpPaths: Map<string, PredicatePath[]>, RelationPath: Path, foundPath?: FoundPath) : PredicatePath[] {
    let matchingPaths : PredicatePath[] = []
    if (foundPath && foundPath?.pathEnd && foundPath.pathEnd.termType === 'Variable') {
      matchingPaths = bgpPaths.get(foundPath.pathEnd.id) || []
    } else {
      for (const pathArray of bgpPaths.values()) {
        matchingPaths = matchingPaths.concat(pathArray)
      }
    }
    return matchingPaths.filter(path => { return path.value === RelationPath.value })
  }

  /**
   * This function matches a Basic Graph Pattern with a given shacl Path.
   * The shacl path converted to a parse tree, and this function is called recursively on every node to check for a matching path in the BGP.
   * @param bpg This object contains the data triples of the basic graph pattern in which we want to match the path parameter of a relation
   * @param path The path to match for this bgp.
   * @param subjectId The subject identifier used to match a triple of the BGP.
   */
  static matchBGP (bgpPaths: Map<string, PredicatePath[]>, path : Path, foundPath? : FoundPath | undefined) : FoundPath[] {
    // Process shacl predicate path
    if (path instanceof (PredicatePath)) {
      // Find Quads matching the current relation predicate path
      const BGPMatchingPaths = this.findMatchingBGPPaths(bgpPaths, path, foundPath)
      return BGPMatchingPaths.length ? BGPMatchingPaths.map(matchingPath => {
        if (!matchingPath.object) throw new Error('Path conversion could not connect intermediary variables,')
        return { paths: ([...foundPath?.paths || []]).concat(matchingPath), pathEnd: matchingPath.object }
      }) : []
      // Process shacl sequence path
      // Since we processed all sequence paths as sequences of the individual elements, we match all individual elements of the sequencePath
    } else if (path instanceof (SequencePath)) {
      let resultingFoundPaths : FoundPath[] = []
      if (path.value.length > 1) {
        // Find all possible quads at this point matching the first value of the sequence path
        const firstChildFoundPaths = this.matchBGP(bgpPaths, path.value[0], foundPath)
        for (const foundPath of firstChildFoundPaths) {
          // For all matches, if the sequence path is longer than this first element, call function recursively for the rest of the sequence path for all paths matching the current f
          const tailFoundPaths = this.matchBGP(bgpPaths, new SequencePath([...path.value.slice(1)]), foundPath)
          resultingFoundPaths = resultingFoundPaths.concat(tailFoundPaths)
        }
        return resultingFoundPaths
      } else {
        // If the sequcuence path only has a single element, return the found paths for that element
        return this.matchBGP(bgpPaths, path.value[0], foundPath)
      }
    } else if (path instanceof (AlternativePath)) {
      let results : FoundPath[] = []
      for (const childPath of path.value) {
        results = results.concat(this.matchBGP(bgpPaths, childPath, foundPath))
      }
      return results
    } else {
      throw new Error('Path type not yet supported')
    }
  }

  static extractVariableBindingsFromBGP (pattern : N3.Quad[]) : VariableBinding[] {
    const variableBindings = []
    for (const quad of pattern) {
      if (quad.subject.termType !== 'BlankNode') {
        if (quad.subject.termType === 'Variable') variableBindings.push(bindVariableToTerm(quad.subject, undefined))
        else variableBindings.push(bindVariableToTerm(undefined, quad.subject))
      }
      if (quad.object.termType !== 'BlankNode') {
        if (quad.object.termType === 'Variable') variableBindings.push(bindVariableToTerm(quad.object, undefined))
        else variableBindings.push(bindVariableToTerm(undefined, quad.object))
      }
    }
    return variableBindings
  }

  /**
   * This function returns the enpoints of all valid matches in the query with the relation path.
   * Valid matches consist of IRIs and literals.
   * @param bgpFoundMatchingPaths
   * @param BGPPaths
   */
  static checkBGPMatch (bgpFoundMatchingPaths: FoundPath[]): ProcessedPattern | null {
    const endpoints = []
    const paths = []
    for (const path of bgpFoundMatchingPaths) {
      if (path.pathEnd.termType === 'NamedNode' || path.pathEnd.termType === 'Literal' || path.pathEnd.termType === 'Variable') {
        endpoints.push(path.pathEnd)
        paths.push(path)
      }
    }
    if (!paths.length || !endpoints.length /* || paths.length !== endpoints.length */) return null
    return { type: 'bgp', paths: paths, matches: endpoints }
  }

  static getPath (quad : any) {
    const predicatePath = quad.predicate
    if (predicatePath.type === 'path') {
      switch (predicatePath.pathType) {
        case '|':
          return 'alternativePath'
        case '/':
          return 'sequencePath'
        case '^':
          return 'inversePath'
        case '+':
          return 'oneOrMorePath'
        case '*':
          return 'zeroOrMorePath'
        case '!':
          throw new Error("'!' operator is not yet supported for tree path tracing")
      }
    } else {
      return 'predicatePath'
    }
  }
}
