import { addToMapList, getIdOrValue, FoundPath } from './Util'
import AlternativePath from '../Paths/AlternativePath'
import SequencePath from '../Paths/SequencePath'
import PredicatePath from '../Paths/PredicatePath'
import * as N3 from 'n3'
import Path from '../Paths/Path'
import ProcessedPattern from './ProcessedPattern'

export class BGPEvaluator {
  /**
   * Extract all paths in the BGP
   * @param pattern
   */
  static extractBGPPaths (pattern : N3.Quad[]) {
    const subjectMap = new Map<string, Path[]>()
    const typesMap = new Map<string, Path[]>()
    let indexCounter = 0

    const newBlankNodeId = function () { return 'sequencePathVariable' + (indexCounter++) }
    var createdPath = null
    for (const quad of pattern) {
      // subjectMap.set(quad.subject.value || quad.subject.id, quad)
      const predicate : any = quad.predicate
      if (predicate.pathType) {
        switch (this.getPath(quad)) {
          case 'predicatePath':
            createdPath = new PredicatePath(getIdOrValue(quad.predicate), quad.subject, quad.object)
            addToMapList(typesMap, 'predicatePath', createdPath)
            addToMapList(subjectMap, getIdOrValue(quad.subject), createdPath)
            break
          case 'sequencePath':
            var currentBlankNode
            var nextBlankNode
            var sequencePaths = []
            // We expect the length of a sequence path to be at least 2
            for (const [i, v] of predicate.items.entries()) {
              if (i === 0) {
                nextBlankNode = N3.DataFactory.blankNode(newBlankNodeId())
                createdPath = new PredicatePath(getIdOrValue(v), quad.subject, nextBlankNode)
                addToMapList(subjectMap, getIdOrValue(quad.subject), createdPath)
              } else if (i === predicate.items.length - 1) {
                createdPath = new PredicatePath(getIdOrValue(v), nextBlankNode, quad.object)
                addToMapList(subjectMap, getIdOrValue(nextBlankNode), createdPath)
              } else {
                currentBlankNode = nextBlankNode
                nextBlankNode = N3.DataFactory.blankNode(newBlankNodeId())
                createdPath = new PredicatePath(getIdOrValue(v), currentBlankNode, nextBlankNode)
                addToMapList(subjectMap, getIdOrValue(currentBlankNode), createdPath)
              }
              addToMapList(typesMap, 'predicatePath', createdPath)
              sequencePaths.push(createdPath)
            }
            addToMapList(typesMap, 'sequencePath', new SequencePath(sequencePaths))
            break

          case 'alternativePath':
            var alternativePaths = []
            for (const childPath of predicate.items) {
              // We create predicate path entries for the individual possible paths of the alternativePath
              createdPath = new PredicatePath(getIdOrValue(childPath), quad.subject, quad.object)
              addToMapList(subjectMap, getIdOrValue(quad.subject), createdPath)
              addToMapList(typesMap, 'predicatePath', createdPath)
              alternativePaths.push(createdPath)
            }
            // We also add the alternative path to the type map.
            addToMapList(typesMap, 'alternativePath', new AlternativePath(alternativePaths, quad.subject, quad.object))
            break
          default:
            throw new Error(predicate.pathType + ' is currently not implemented.')
        }
      } else {
        // If no path is specified, we handle the Term as a predicatePath
        createdPath = new PredicatePath(getIdOrValue(quad.predicate), quad.subject, quad.object)
        addToMapList(typesMap, 'predicatePath', createdPath)
        addToMapList(subjectMap, getIdOrValue(quad.subject), createdPath)
      }
    }
    return [subjectMap, typesMap]
  }

  /**
   * This function matches a Basic Graph Pattern with a given shacl Path.
   * @param bpg This object contains the data triples of the basic graph pattern in which we want to match the path parameter of a relation
   * @param path The path to match for this bgp.
   * @param subjectId The subject identifier used to match a triple of the BGP.
   */
  static matchBGP (bgpTypesMap : Map<string, Path[]>, path : Path, foundPath? : FoundPath | undefined) : FoundPath[] | undefined {
    // Process shacl predicate path
    if (path instanceof (PredicatePath)) {
      const results : FoundPath[] = []
      for (const pathInstance of bgpTypesMap.get('predicatePath') || []) {
        // Check if the subject of the predicate path fits the end of the currently found path
        if (!foundPath || (foundPath.path.indexOf(pathInstance) === -1 && getIdOrValue(foundPath.pathEnd) === getIdOrValue(pathInstance.subject))) {
          // Check if predicates match
          if (path.value && path.value.toString() === getIdOrValue(pathInstance)) {
            const totalPath = foundPath ? foundPath.path.concat(pathInstance) : [pathInstance]
            results.push({ path: totalPath, pathEnd: pathInstance.object as N3.Term }) // TODO:: Fix type conversions via general rdf type library
          }
        }
      }
      return results

      // Process shacl sequence path
      // Since we processed all sequence paths as sequences of the individual elements, we match all individual elements of the sequencePath
    } else if (path instanceof (SequencePath)) {
      let foundPaths = foundPath ? [foundPath] : []
      let newFoundPaths : FoundPath[]
      for (const childPath of path.value) {
        newFoundPaths = []
        if (foundPaths.length === 0) {
          newFoundPaths = newFoundPaths.concat(this.matchBGP(bgpTypesMap, childPath) || [])
        } else {
          for (const currentFoundPath of foundPaths) {
            newFoundPaths = newFoundPaths.concat(this.matchBGP(bgpTypesMap, childPath, currentFoundPath) || [])
          }
        }

        if (newFoundPaths.length === 0) return // Could not match a child path in the sequence path
        foundPaths = newFoundPaths
      }
      // This will return the match of the last element in the sequence path
      return foundPaths

      // Process schal alternative path
      // First we match the alternativePath, then we match all individual possibilities
    } else if (path instanceof (AlternativePath)) {
      let results : FoundPath[] = []
      for (const pathInstance of bgpTypesMap.get('alternativePath') || []) {
        if (!foundPath || (foundPath.path.indexOf(pathInstance) === -1 && getIdOrValue(foundPath.pathEnd) === getIdOrValue(pathInstance.subject))) {
          for (const childPath of path.value) {
            const newFoundPath : FoundPath = { path: [pathInstance].concat(foundPath ? foundPath.path : []), pathEnd: pathInstance.subject as N3.Term || undefined }
            const result = this.matchBGP(bgpTypesMap, childPath, newFoundPath)
            if (!result || result.length === 0) {
              results = []
              break
            } else { results = results.concat(result) }
          }
          // If we find a complete match return
          return results
        }
      }
      if (results.length !== 0) return results
    } else {
      throw new Error('Path type not yet supported')
    }
  }

  /**
   * This function returns the ends of the relation path match multiple if there are multiple matches).
   * In case the match does not allow for pruning of a relation (it is not a full match), null is returned
   * @param bgpFoundMatchingPaths
   * @param BGPPaths
   */
  static checkFullBGPMatch (bgpFoundMatchingPaths: FoundPath[], BGPPaths: Map<string, Path[]>) : ProcessedPattern | null {
    var usedPaths : Path[] = []
    var fullMatch = true
    for (const match of bgpFoundMatchingPaths || []) {
      usedPaths = usedPaths.concat(match.path)
    }
    for (const path of BGPPaths.get('alternativePath') || []) {
      if (usedPaths.indexOf(path) === -1) {
        fullMatch = false
      }
    }
    for (const path of BGPPaths.get('predicatePath') || []) {
      if (usedPaths.indexOf(path) === -1) {
        fullMatch = false
      }
    }
    if (!fullMatch) {
      return null
    }

    var pathEnds = bgpFoundMatchingPaths.map(e => e.pathEnd)
    var uniquePathEnds = []
    for (const pathEnd of pathEnds || []) {
      let found = false
      for (const uniquePathEnd of uniquePathEnds) {
        if (getIdOrValue(pathEnd) === getIdOrValue(uniquePathEnd)) {
          found = true
          break
        }
      }
      // Only push unique path Ends
      if (!found) uniquePathEnds.push(pathEnd)
    }
    return { type: 'bgp', matches: uniquePathEnds }
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
          console.error("'!' operator is not yet supported for tree path tracing")
          return 'predicatePath'
      }
    } else {
      return 'predicatePath'
    }
  }
}
