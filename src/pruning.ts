
import * as SPARQLJS from 'sparqljs'
import * as N3 from 'n3'
import Path from './Paths/Path'
import ExpressionEvaluator from './Util/ExpressionEvaluator'
import { getIdOrValue, Relation, isValidValueRange, getNextNonPrefixString, FoundPath, checkLiteral } from './Util/Util'
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
import DateTimeValueRange from './ValueRanges/DateTimeValueRange'
import UnknownValueRange from './ValueRanges/UnknownValueRange'

const tree = NameSpaces.TREE
const MATCHERRORSTRING = 'No matching path was found for the given query'

export async function evaluate (query: string, relation: Relation) : Promise<boolean> {
  try {
    // First we extract the path from the relation and convert it to an internal representation.
    const relationPath = await Converter.extractRelationPath(relation)
    if (!relationPath) return false // We cannot prune this relation if the path cannot be extracted from the relation
    // Secondly evaluate if we can prune the relation based on the extracted path and relation type and value
    relation.processedPath = relationPath
    return canPruneRelationForQuery(query, relation)
  } catch (e) {
    console.error(e)
    return false
  }
}

export function canPruneRelationForQuery (query: string, relation: Relation) : boolean {
  // TODO:: Refactor this to incorporate value ranges for relations pointing to same node for completer result.

  // If no path is present, we cannot use the relation, as it does not lead us anywhere
  if (!relation['tree:path']) return true

  // In case no relation value is given, we cannot prune the relation
  if (!relation['tree:value']) return false
  return matchRelationValueWithPathMatchingValueRanges(query, relation)
}

function matchRelationValueWithPathMatchingValueRanges (query: string, relation: Relation): boolean {
  let patterns
  try { patterns = processPatterns(query, relation) } catch (error) { console.log(error); throw new Error('Query could not be parsed correctly') }
  if (!patterns || patterns.length === 0) return false

  let bgpMatches: N3.Term[] = []
  let variableMatches: VariableBinding[] = []

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
  // console.log('canPruneRelationForValueRanges', resultingValueRanges, relation)
  for (const valueRange of resultingValueRanges) {
    if (!isValidValueRange(valueRange)) throw new Error('incorrect value range: ' + valueRange.toString()) // Cannot reason over these relations so cant prune
    let treeValue
    if (valueRange instanceof StringValueRange) {
      treeValue = relation['tree:value'].value.toString()
    } else if (valueRange instanceof NumberValueRange) {
      if (relation['tree:value'].datatype.value in [NameSpaces.XSD + 'decimal', NameSpaces.XSD + 'integer', NameSpaces.XSD + 'float', NameSpaces.XSD + 'double']) return false
      switch (valueRange.dataType) {
        case DataType.DECIMAL:
          treeValue = parseInt(relation['tree:value'].value)
          break
        case DataType.INTEGER:
          treeValue = parseInt(relation['tree:value'].value)
          break
        case DataType.FLOAT:
          treeValue = parseFloat(relation['tree:value'].value)
          break
        case DataType.DOUBLE:
          treeValue = parseFloat(relation['tree:value'].value)
          break
        default:
          treeValue = parseFloat(relation['tree:value'].value)
          break
      }
    } else if (valueRange instanceof DateTimeValueRange) {
      if (relation['tree:value'].datatype.value !== NameSpaces.XSD + 'dateTime') return false
      treeValue = new Date(relation['tree:value'].value)
    }
    if (!treeValue) {
      throw new Error('Could not convert relation type to evaluated query value range data type')
    }

    let startComparison
    let endComparison

    switch (relation['@type']) {
      case tree + 'PrefixRelation':
        if (valueRange instanceof StringValueRange) {
          const nextSmallestPrefix = getNextNonPrefixString(treeValue as string)
          startComparison = !valueRange.start || !nextSmallestPrefix || valueRange.start.localeCompare(nextSmallestPrefix) < 0
          endComparison = !valueRange.end || valueRange.end.localeCompare(treeValue as string) >= 0
        } else if (checkLiteral(valueRange as UnknownValueRange)) {
          const unknownvalueRange = valueRange as UnknownValueRange
          treeValue = relation['tree:value'].value.toString()
          const nextSmallestPrefix = getNextNonPrefixString(treeValue as string)
          startComparison = !unknownvalueRange.start || !nextSmallestPrefix || unknownvalueRange.start.toString().localeCompare(nextSmallestPrefix) < 0
          endComparison = !unknownvalueRange.end || unknownvalueRange.end.toString().localeCompare(treeValue as string) >= 0
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!startComparison || !endComparison) return true
        break

      case tree + 'LessThanRelation':
        if (valueRange instanceof StringValueRange) {
          startComparison = !valueRange.start || valueRange.start.localeCompare(treeValue as string) < 0
        } else if (valueRange instanceof NumberValueRange) {
          startComparison = !valueRange.start || valueRange.start < treeValue
        } else if (valueRange instanceof DateTimeValueRange) {
          startComparison = !valueRange.start || valueRange.start.getTime() < (treeValue as Date).getTime()
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!startComparison) return true
        break

      case tree + 'LessOrEqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.localeCompare(treeValue as string) <= 0 : valueRange.start.localeCompare(treeValue as string) < 0)
        } else if (valueRange instanceof NumberValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start <= treeValue : valueRange.start < treeValue)
        } else if (valueRange instanceof DateTimeValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.getTime() <= (treeValue as Date).getTime() : valueRange.start.getTime() < (treeValue as Date).getTime())
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!startComparison) return true
        break

      case tree + 'GreaterThanRelation':
        if (valueRange instanceof StringValueRange) {
          endComparison = !valueRange.end || valueRange.end.localeCompare(treeValue as string) > 0
        } else if (valueRange instanceof NumberValueRange) {
          endComparison = !valueRange.end || valueRange.end > treeValue
        } else if (valueRange instanceof DateTimeValueRange) {
          endComparison = !valueRange.end || valueRange.end.getTime() > (treeValue as Date).getTime()
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!endComparison) return true
        break

      case tree + 'GreaterOrEqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.localeCompare(treeValue as string) >= 0 : valueRange.end.localeCompare(treeValue as string) > 0)
        } else if (valueRange instanceof NumberValueRange) {
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end >= treeValue : valueRange.end > treeValue)
        } else if (valueRange instanceof DateTimeValueRange) {
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.getTime() >= (treeValue as Date).getTime() : valueRange.end.getTime() > (treeValue as Date).getTime())
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!endComparison) return true
        break

      case tree + 'EqualThanRelation':
        if (valueRange instanceof StringValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.localeCompare(treeValue as string) <= 0 : valueRange.start.localeCompare(treeValue as string) < 0)
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.localeCompare(treeValue as string) >= 0 : valueRange.end.localeCompare(treeValue as string) > 0)
        } else if (valueRange instanceof NumberValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start <= treeValue : valueRange.start < treeValue)
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end >= treeValue : valueRange.end > treeValue)
        } else if (valueRange instanceof DateTimeValueRange) {
          startComparison = !valueRange.start || (valueRange.startInclusive ? valueRange.start.getTime() <= (treeValue as Date).getTime() : valueRange.start.getTime() < (treeValue as Date).getTime())
          endComparison = !valueRange.end || (valueRange.endInclusive ? valueRange.end.getTime() >= (treeValue as Date).getTime() : valueRange.end.getTime() > (treeValue as Date).getTime())
        } else {
          throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
        }
        if (!startComparison || !endComparison) return true
        break

      default:
        throw new Error('Evaluated value range type : ' + valueRange.dataType + ' cannot be used to prune relation type: ' + relation['@type'])
    }
    return false
  }
  return false
}

export function processPatterns (query: string, relation: Relation) {
  const jsonquery = parseQuery(query)
  switch (jsonquery.queryType) {
    case 'SELECT':
      return evaluateSelectQuery(jsonquery, relation)
    case 'CONSTRUCT':
      return evaluateConstructQuery(jsonquery, relation)
    case 'ASK':
      return evaluateAskQuery(jsonquery, relation)
    case 'DESCRIBE':
      return evaluateDesciribeQuery(jsonquery, relation)
  }
}

function evaluateQueryWhereBGP (query : SPARQLJS.Query, relation: Relation) {
  const evaluatedPatterns : ProcessedPattern[] = []
  if (!query.where) return []
  for (const pattern of query.where) {
    const evaluatedPattern = evaluatePattern(pattern, relation.processedPath)
    if (evaluatedPattern) evaluatedPatterns.push(evaluatedPattern)
  }
  return evaluatedPatterns
}

function evaluateSelectQuery (query : SPARQLJS.SelectQuery, relation: Relation) {
  if (relation['tree:path'] && !relation.processedPath) throw new Error('Relation path could not be processed succesfully: ' + relation['tree:path'].toString())
  return evaluateQueryWhereBGP(query, relation)
}

function evaluateConstructQuery (query : SPARQLJS.ConstructQuery, relation: Relation) {
  if (relation['tree:path'] && !relation.processedPath) throw new Error('Relation path could not be processed succesfully: ' + relation['tree:path'].toString())
  return evaluateQueryWhereBGP(query, relation)
}

function evaluateAskQuery (query : SPARQLJS.AskQuery, relation: Relation) {
  if (relation['tree:path'] && !relation.processedPath) throw new Error('Relation path could not be processed succesfully: ' + relation['tree:path'].toString())
  return evaluateQueryWhereBGP(query, relation)
}

function evaluateDesciribeQuery (query : SPARQLJS.DescribeQuery, relation: Relation) {
  if (relation['tree:path'] && !relation.processedPath) throw new Error('Relation path could not be processed succesfully: ' + relation['tree:path'].toString())
  return evaluateQueryWhereBGP(query, relation)
}

/**
 * This function evaluates SPARQL patterns
 * For a BGP, it returns the value ranges or variables that match the relation path
 * In case no relation path is present, it return all present value ranges and variables.\
 * For a Filter pattern, the function returns all present value ranges and the variable they are bound to.
 * @param pattern
 * @param relationPath
 */
function evaluatePattern (pattern : SPARQLJS.Pattern, relationPath : Path | undefined) : ProcessedPattern | undefined {
  switch (pattern.type) {
    case 'bgp':
      if (relationPath) {
        const paths = BGPEvaluator.extractPathsFromBGP(pattern.triples as unknown as N3.Quad[])
        // Now that all invidual paths have been extracted, we combine them to match the relation path
        const foundBGPMatches = BGPEvaluator.matchBGP(paths, relationPath) || []
        if (!foundBGPMatches /* || !foundBGPMatches.length */) { throw new Error(MATCHERRORSTRING) }
        // Now we check if the found path allows the relation to be pruned
        var matchedBGP = BGPEvaluator.checkBGPMatch(foundBGPMatches)
        if (!matchedBGP /* || (matchedBGP.matches && !matchedBGP.matches.length) */) { throw new Error(MATCHERRORSTRING) }
        return matchedBGP
      } else {
        return { type: 'bgp', bindings: BGPEvaluator.extractVariableBindingsFromBGP(pattern.triples as unknown as N3.Quad[]) }
      }

    case 'filter':

      return { type: 'filter', bindings: ExpressionEvaluator.evaluateExpression(pattern.expression) }

    default:
      break
  }
}

function parseQuery (query: string) : SPARQLJS.Query {
  const jsonquery = new SPARQLJS.Parser().parse(query)
  if (jsonquery.type === 'update') throw new Error('Tree relations cannot be processed for update queries')
  return jsonquery
}
