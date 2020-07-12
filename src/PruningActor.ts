
import * as SPARQLJS from 'sparqljs'
import * as N3 from 'n3'
import Path from './Paths/Path'
import ExpressionEvaluator from './Util/ExpressionEvaluator'
import { getIdOrValue, Relation } from './Util/Util'
import { BGPEvaluator } from './Util/BGPEvaluator'
import Converter from './Util/Converter'
import ProcessedPattern from './Util/ProcessedPattern'

export default class PruningActor {
  // static convert

  static async evaluate (query: string, relation: Relation) : Promise<boolean> {
    try {
      // First we extract the path from the relation and convert it to an internal representation.
      const relationPath = await Converter.extractRelationPath(relation)
      if (!relationPath) return false // We cannot prune this relation if the path cannot be extracted from the relation
      // Secondly we parse and process the query tree.
      this.processQueryParseTree(query, relationPath)

      // Thirdly we decide based on the processed tree if we can prune the relation
      return false
    } catch (e) {
      console.error(e)
      return false
    }
  }

  static processQueryParseTree (query: string, relationPath : Path) {
    // translate the string query into json format
    const sparqlJSON = new SPARQLJS.Parser().parse(query)
    const jsonquery = sparqlJSON as SPARQLJS.Query

    // We currently only support pruning for select queries with a where clause
    if (jsonquery.queryType !== 'SELECT') { return null }
    if (!jsonquery.where) return null

    const patterns = []
    for (const pattern of jsonquery.where) {
      patterns.push(this.evaluatePattern(pattern, relationPath))
    }
    return patterns
  }

  static evaluatePattern (pattern : SPARQLJS.Pattern, relationPath : Path) : ProcessedPattern | undefined {
    console.log('evaluating', JSON.stringify(pattern, null, 2))
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
}
