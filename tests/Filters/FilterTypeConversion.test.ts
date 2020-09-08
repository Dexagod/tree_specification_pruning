/* eslint-disable no-multi-str */
import { expect } from 'chai'
import 'mocha'
import Converter from '../../src/Util/Converter'
import { JsonLdParser } from 'jsonld-streaming-parser'
import * as N3 from 'n3'
import PredicatePath from '../../src/Paths/PredicatePath'
import SequencePath from '../../src/Paths/SequencePath'
import AlternativePath from '../../src/Paths/AlternativePath'
import { AssertionError } from 'assert'
import { resolve } from 'dns'
import * as SPARQLJS from 'sparqljs'
import ExpressionEvaluator from '../../src/Util/ExpressionEvaluator'
import { Relation, defaultContext } from '../../src/Util/Util'

const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const shacl = 'http://www.w3.org/ns/shacl#'
const tree: string = 'https://w3id.org/tree#'
const ex = 'http://www.example.org#'
const xsd = 'http://www.w3.org/2001/XMLSchema'

describe('Testing path matching',
  () => {
    function filterShouldEvaluateTo (relation: Relation, query: string, term: N3.Term | null, message: string) {
      it(message, async function () {
        const sparqlJSON = new SPARQLJS.Parser().parse(query)
        const jsonquery = sparqlJSON as SPARQLJS.Query

        // We currently only support pruning for select queries with a where clause
        if (!jsonquery.where) return null

        const patterns = []
        for (const pattern of jsonquery.where) {
          switch (pattern.type) {
            case 'filter':
              patterns.push({ type: 'filter', mappings: ExpressionEvaluator.evaluateExpression(pattern.expression, relation) })
              break

            default:
              break
          }
        }
      })
    }

    // function filterShouldErrorWith (query: string, errorMessage: string, message: string) {
    //   it(message, async function () {
    //     // Expect the query to not the reEvaluateTo lation, and throw the errorMessage error
    //     return expect(Converter.matchesPath(relation, query)).to.be.rejectedWith(errorMessage)
    //   })
    // }

    function test () {
      const context = {
        rdf: rdf,
        shacl: shacl,
        tree: tree,
        ex: ex,
        xsd: xsd
      }
      const prefixRelation : Relation = {
        '@context': context,
        '@type': 'PrefixRelation',
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': N3.DataFactory.literal('Test'),
        'tree:node': 'http://www.example.org#node2'
      }

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?p ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(?o > "test") \
        } LIMIT 10',
        null,
        'should process > operator')

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?p ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(?o >= "test") \
        } LIMIT 10',
        null,
        'should process >= operator')

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?p ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(?o < "test") \
        } LIMIT 10',
        null,
        'should process < operator')

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?p ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(?o <= "test") \
        } LIMIT 10',
        null,
        'should process <= operator')
    }

    test()
  })
