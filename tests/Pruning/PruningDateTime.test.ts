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
import ValueRange from '../../src/ValueRanges/ValueRange'
import StringValueRange from '../../src/ValueRanges/StringValueRange'
import { DataType } from '../../src/Util/DataTypes'
import VariableBinding from '../../src/Bindings/VariableBinding'
import { Relation, defaultContext } from '../../src/Util/Util'
import { evaluate } from '../../src'
import { NameSpaces } from '../../src/Util/NameSpaces'

const rdf = NameSpaces.RDF
const shacl = NameSpaces.SHACL
const tree = NameSpaces.TREE
const ex = NameSpaces.EX
const xsd = NameSpaces.XSD

const date1 = '2020-10-10T10:00:00'

const date2 = '2020-10-11T10:00:00'

const date3 = '2020-10-11T12:00:00'

const date4 = '2020-10-11T15:00:00'

const date5 = '2020-10-12T15:00:00'

function wrap (date: string) {
  return ('"' + date + '"^^<' + xsd + 'dateTime>')
}

describe('Testing tree pruning for datetime queries and relations',
  () => {
    function evaluationShouldPrune (relation: Relation, query: string, shouldPrune: boolean, message: string) {
      it(message, async function () {
        try {
          const result = evaluate(query, relation)
          return expect(result).to.eventually.equal(shouldPrune)
        } catch (e) {
          console.error(e)
          expect(e).to.equal(null)
        }
      })
    }

    // function filterShouldErrorWith (query: string, errorMessage: string, message: string) {
    //   it(message, async function () {
    //     // Expect the query to not the reEvaluateTo lation, and throw the errorMessage error
    //     return expect(Converter.matchesPath(relation, query)).to.be.rejectedWith(errorMessage)
    //   })
    // }

    const context = {
      rdf: rdf,
      shacl: shacl,
      tree: tree,
      ex: ex,
      xsd: xsd
    }

    function createRelation (type: string, value: string | number) : Relation {
      return {
        '@context': context,
        '@type': tree + type,
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': N3.DataFactory.literal(value, N3.DataFactory.namedNode(NameSpaces.XSD + 'dateTime')),
        'tree:node': 'http://www.example.org#node2'
      }
    }

    function createQuery (filter: string) : string {
      return ('PREFIX ex: <http://www.example.org#> \
      SELECT ?s ?o WHERE { \
        ?s ex:predicate ?o . \
        FILTER(' + filter + ') \
      } LIMIT 10')
    }

    function createQueryLiteral (literal: string) : string {
      return ('PREFIX ex: <http://www.example.org#> \
      SELECT ?s ?o WHERE { \
        ?s ex:predicate ' + literal + ' . \
      } LIMIT 10')
    }

    function testLesserThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', date1),
        createQuery('?o < ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQuery('?o < ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date5),
        createQuery('?o < ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQuery('?o < ' + wrap(date3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date1),
        createQuery('?o < ' + wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQuery('?o < ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date5),
        createQuery('?o < ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQuery('?o < ' + wrap(date3)),
        true,
        'GreaterOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQuery('?o < ' + wrap(date3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }

    function testLesserOrEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', date1),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date5),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date1),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQuery('?o <= ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date5),
        createQuery('?o <= ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'GreaterOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQuery('?o <= ' + wrap(date3)),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }
    function testGreaterThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQuery('?o > ' + wrap(date3)),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQuery('?o > ' + wrap(date3)),
        true,
        'LessOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQuery('?o > ' + wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQuery('?o > ' + wrap(date3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQuery('?o > ' + wrap(date3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }
    function testGreaterOrEqualThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('PrefixRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        false,
        'PrefixRelation relation should not be pruned when querying datetimes')

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        false,
        'LessOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQuery('?o >= ' + wrap(date3)),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }

    function testEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', date1),
        createQuery('?o = ' + wrap(date3)),
        true,
        'LessThan relation should be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQuery('?o = ' + wrap(date3)),
        true,
        'LessThan relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', date5),
        createQuery('?o = ' + wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQuery('?o = ' + wrap(date3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date1),
        createQuery('?o = ' + wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQuery('?o = ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date5),
        createQuery('?o = ' + wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQuery('?o = ' + wrap(date3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQuery('?o = ' + wrap(date3)),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'tes'),
        createQuery('?o = ' + wrap(date3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is not equal to the query value')
    }

    function testLiteral () {
      evaluationShouldPrune(createRelation('LessThanRelation', date1),
        createQueryLiteral(wrap(date3)),
        true,
        'LessThan relation should be pruned if relation value is less than the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', date3),
        createQueryLiteral(wrap(date3)),
        true,
        'LessThan relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', date5),
        createQueryLiteral(wrap(date3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', date3),
        createQueryLiteral(wrap(date3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date1),
        createQueryLiteral(wrap(date3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date3),
        createQueryLiteral(wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', date5),
        createQueryLiteral(wrap(date3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', date3),
        createQueryLiteral(wrap(date3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', date3),
        createQueryLiteral(wrap(date3)),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'tes'),
        createQueryLiteral(wrap(date3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is not equal to the query literal')
    }

    testLesserThan()
    testLesserOrEqualThan()
    testGreaterThan()
    testGreaterOrEqualThan()
    testEqualThan()
    testLiteral()
  })
