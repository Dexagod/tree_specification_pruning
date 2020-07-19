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

describe('Testing tree pruning for number queries and relations',
  () => {
    function evaluationShouldPrune (relation: Relation, query: string, shouldPrune: boolean, message: string) {
      it(message, async function () {
        const result = evaluate(query, relation)
        return expect(result).to.eventually.equal(shouldPrune)
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

    const n1 = 1
    const n2 = 2
    const n3 = 3
    const n4 = 4
    const n5 = 5

    function wrap (n: number, type = 'integer') {
      return ('"' + n.toString() + '"^^<' + xsd + type + '>')
    }

    function createRelation (type: string, value: string | number) : Relation {
      return {
        '@context': context,
        '@type': tree + type,
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': value,
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
      evaluationShouldPrune(createRelation('LessThanRelation', n1),
        createQuery('?o < ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQuery('?o < ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n5),
        createQuery('?o < ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQuery('?o < ' + wrap(n3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n1),
        createQuery('?o < ' + wrap(n3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQuery('?o < ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n5),
        createQuery('?o < ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQuery('?o < ' + wrap(n3)),
        true,
        'GreaterOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQuery('?o < ' + wrap(n3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }

    function testLesserOrEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', n1),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n5),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n1),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQuery('?o <= ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n5),
        createQuery('?o <= ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'GreaterOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQuery('?o <= ' + wrap(n3)),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }
    function testGreaterThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('PrefixRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        false,
        'PrefixRelation relation cannot be pruned if query evaluates to number value range')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        true,
        'LessOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQuery('?o > ' + wrap(n3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }
    function testGreaterOrEqualThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('PrefixRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        false,
        'PrefixRelation relation cannot be pruned if query evaluates to number value range')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        false,
        'LessOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQuery('?o >= ' + wrap(n3)),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }

    function testEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', n1),
        createQuery('?o = ' + wrap(n3)),
        true,
        'LessThan relation should be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQuery('?o = ' + wrap(n3)),
        true,
        'LessThan relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', n5),
        createQuery('?o = ' + wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQuery('?o = ' + wrap(n3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n1),
        createQuery('?o = ' + wrap(n3)),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQuery('?o = ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n5),
        createQuery('?o = ' + wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQuery('?o = ' + wrap(n3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQuery('?o = ' + wrap(n3)),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', n2),
        createQuery('?o = ' + wrap(n3)),
        true,
        'EqualThanRelation relation should be pruned if relation value is not equal to the query value')
    }

    function testLiteral () {
      evaluationShouldPrune(createRelation('LessThanRelation', n1),
        createQueryLiteral(wrap(n3)),
        true,
        'LessThan relation should be pruned if relation value is less than the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', n3),
        createQueryLiteral(wrap(n3)),
        true,
        'LessThan relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', n5),
        createQueryLiteral(wrap(n3)),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', n3),
        createQueryLiteral(wrap(n3)),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n3),
        createQueryLiteral(wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', n5),
        createQueryLiteral(wrap(n3)),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', n3),
        createQueryLiteral(wrap(n3)),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', n3),
        createQueryLiteral(wrap(n3)),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', n4),
        createQueryLiteral(wrap(n3)),
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
