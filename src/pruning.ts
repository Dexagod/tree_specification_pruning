
import * as SPARQLJS from 'sparqljs'
import * as N3 from 'n3'
import Path from './Paths/Path'
import ExpressionEvaluator from './Util/ExpressionEvaluator'
import { getIdOrValue, Relation, isValidValueRange, getNextNonPrefixString } from './Util/Util'
import { BGPEvaluator } from './Util/BGPEvaluator'
import Converter from './Util/Converter'
import ProcessedPattern from './Util/ProcessedPattern'
import { match } from 'assert'
import VariableBinding from './Bindings/VariableBinding'
import StringValueRange from './ValueRanges/StringValueRange'
import { DataType } from './Util/DataTypes'
import { bindVariableToTerm } from './Util/Operations'
import { NamedNode, Literal } from 'rdf-js'
import ValueRange from './ValueRanges/ValueRange'
import NumberValueRange from './ValueRanges/NumberValueRange'
import { NameSpaces } from './Util/NameSpaces'

const tree = NameSpaces.TREE

export async function evaluate (query: string, relation: Relation) : Promise<boolean> {
  try {
    // First we extract the path from the relation and convert it to an internal representation.
    const relationPath = await Converter.extractRelationPath(relation)
    if (!relationPath) return false // We cannot prune this relation if the path cannot be extracted from the relation
    // Secondly evaluate if we can prune the relation based on the extracted path and relation type and value
    return canPruneRelationForQuery(query, relationPath, relation)
  } catch (e) {
    console.error(e)
    return false
  }
}

export function canPruneRelationForQuery (query: string, relationPath : Path, relation: Relation) : boolean {
  // TODO:: Refactor this to incorporate value ranges for relations pointing to same node for completer result.

  const patterns = processPatterns(query, relationPath, relation)
  if (!patterns || patterns.length === 0) return false

  let bgpMatches : N3.Term[] = []
  let variableMatches : VariableBinding[] = []

  for (const pattern of patterns) {
    if (pattern.type === 'bgp') {
      if (pattern.matches) {
        bgpMatches = bgpMatches.concat(pattern.matches)
      }
    } else if (pattern.type === 'filter') {
      if (pattern.bindings) {
        variableMatches = variableMatches.concat(pattern.bindings)
      }
    }
  }

  const resultingValueRanges = []
  // Convert BGP literal matches to value ranges.
  // Paths resulting in blank nodes are not processed, as their string representations are random.
  for (const match of bgpMatches) {
    if (N3.Util.isBlankNode(match)) {
      return false
    } else if (N3.Util.isVariable(match)) {
      for (const variableMatch of variableMatches) {
        if (variableMatch.variable && variableMatch.variable.value === match.value && variableMatch.valueRange) {
          resultingValueRanges.push(variableMatch.valueRange)
        } else { // Unmatched variable -> cant decide on relation
          return false
        }
      }
    } else {
      const varBinding = bindVariableToTerm(undefined, match as NamedNode | Literal)
      if (varBinding.valueRange) {
        resultingValueRanges.push(varBinding.valueRange)
      } else {
        return false
      }
    }
  }

  return canPruneRelationForValueRanges(resultingValueRanges, relation)
}

/**
 *
 * @param resultingValueRanges
 * @param relation
 * returns TRUE if relation CONTAINS USEFULL INFORMATION
 * returns FALSE if relation DOES NOT CONTAIN USEFUL INFORMATION
 */
function canPruneRelationForValueRanges (resultingValueRanges : ValueRange[], relation : Relation) {
  for (const valueRange of resultingValueRanges) {
    if (!isValidValueRange(valueRange)) throw new Error('incorrect value range: ' + valueRange.toString()) // Cannot reason over these relations so cant prune
    switch (relation['@type']) {
      case tree + 'PrefixRelation':
        if (valueRange instanceof StringValueRange) {
          const nextSmallestPrefix = getNextNonPrefixString(relation['tree:value'])
          const startComparison = !valueRange.start || !nextSmallestPrefix || valueRange.start.localeCompare(nextSmallestPrefix) < 0
          const endComparison = !valueRange.end || valueRange.end.localeCompare(relation['tree:value'][0]) >= 0
          if (!startComparison || !endComparison) return true
        }
        break

      case tree + 'LessThanRelation':
        if (valueRange instanceof StringValueRange) {
          const startComparison = !valueRange.start || valueRange.start.localeCompare(relation['tree:value']) < 0
          if (!startComparison) return true
        } else if (valueRange instanceof NumberValueRange) {
          const startComparison = !valueRange.start || valueRange.start < relation['tree:value']
          if (!startComparison) return true
        }
        break

      case tree + 'LessOrEqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          const startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.localeCompare(relation['tree:value']) <= 0 : valueRange.start.localeCompare(relation['tree:value']) < 0)
          if (!startComparison) return true
        } else if (valueRange instanceof NumberValueRange) {
          const startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start <= relation['tree:value'] : valueRange.start < relation['tree:value'])
          if (!startComparison) return true
        }
        break

      case tree + 'GreaterThanRelation':
        if (valueRange instanceof StringValueRange) {
          const endComparison = !valueRange.end || valueRange.end.localeCompare(relation['tree:value']) > 0
          if (!endComparison) return true
        } else if (valueRange instanceof NumberValueRange) {
          const endComparison = !valueRange.end || valueRange.end > relation['tree:value']
          if (!endComparison) return true
        }
        break

      case tree + 'GreaterOrEqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          const endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.localeCompare(relation['tree:value']) >= 0 : valueRange.end.localeCompare(relation['tree:value']) > 0)
          if (!endComparison) return true
        } else if (valueRange instanceof NumberValueRange) {
          const endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end >= relation['tree:value'] : valueRange.end > relation['tree:value'])
          if (!endComparison) return true
        }
        break

      case tree + 'EqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          const startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.localeCompare(relation['tree:value']) <= 0 : valueRange.start.localeCompare(relation['tree:value']) < 0)
          const endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.localeCompare(relation['tree:value']) >= 0 : valueRange.end.localeCompare(relation['tree:value']) > 0)
          if (!startComparison || !endComparison) return true
        } else if (valueRange instanceof NumberValueRange) {
          const startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start <= relation['tree:value'] : valueRange.start < relation['tree:value'])
          const endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end >= relation['tree:value'] : valueRange.end > relation['tree:value'])
          if (!startComparison || !endComparison) return true
        }
        break

      default:
        return false
    }
  }
  return false
}

export function processPatterns (query: string, relationPath : Path, relation: Relation) {
  // translate the string query into json format
  const sparqlJSON = new SPARQLJS.Parser().parse(query)
  const jsonquery = sparqlJSON as SPARQLJS.Query

  // We currently only support pruning for select queries with a where clause
  if (jsonquery.queryType !== 'SELECT') { return [] }
  if (!jsonquery.where) return []

  const evaluatedPatterns : ProcessedPattern[] = []
  for (const pattern of jsonquery.where) {
    const evaluatedPattern = evaluatePattern(pattern, relationPath)
    if (evaluatedPattern) evaluatedPatterns.push(evaluatedPattern)
  }
  return evaluatedPatterns
}

function evaluatePattern (pattern : SPARQLJS.Pattern, relationPath : Path) : ProcessedPattern | undefined {
  switch (pattern.type) {
    case 'bgp':
      // For all path matches (alternative paths with three possibilities are seen as three matches) is checked if all the query paths are used.
      // If this is not the case, there is a path in the query that was not set in the shacl path of the relation, meaning the matched paths are incorrect / incomplete
      var BGPPaths = BGPEvaluator.extractBGPPaths(pattern.triples as unknown as N3.Quad[])[1]
      // Now that all invidual paths have been extracted, we combine them to match the relation path
      var foundBGPMatches = BGPEvaluator.matchBGP(BGPPaths, relationPath)
      if (!foundBGPMatches || !foundBGPMatches.length) { throw new Error('No complete matching path was found for the given query') }
      // Now we check if the found path allows the relation to be pruned
      var matchedBGP = BGPEvaluator.checkFullBGPMatch(foundBGPMatches, BGPPaths)
      if (!matchedBGP || (matchedBGP.matches && !matchedBGP.matches.length)) { throw new Error('No complete matching path was found for the given query') }
      return matchedBGP

    case 'filter':

      return { type: 'filter', bindings: ExpressionEvaluator.evaluateExpression(pattern.expression) }

    default:
      break
  }
}
