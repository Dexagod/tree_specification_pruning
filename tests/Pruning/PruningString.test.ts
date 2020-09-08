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

describe('Testing tree pruning for string queries and relations',
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

    function createRelation (type: string, value: string | number) : Relation {
      return {
        '@context': context,
        '@type': tree + type,
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': N3.DataFactory.literal(value),
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

    function testStringStarts () {
      /**
       * Prefix Relation - strstarts
       */
      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        false,
        'Prefix relation should not be pruned if relation value equals query filter value')

      evaluationShouldPrune(createRelation('PrefixRelation', 't'),
        createQuery('strstarts(?o, "test")'),
        false,
        'Prefix relation should not be pruned if relation value is prefix of query filter value')

      evaluationShouldPrune(createRelation('PrefixRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'Prefix relation should not be pruned if query filter value is prefix of relation value')

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('strstarts(?o, "tez")'),
        true,
        'Prefix relation should be pruned if relation value is no prefix of query value')

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('strstarts(?o, "apple")'),
        true,
        'Prefix relation should be pruned if relation value is no prefix of query value')

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('strstarts(?o, "apple")'),
        true,
        'Prefix relation should be pruned if relation value is no prefix of query value')

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('strstarts(?o, "apple")'),
        true,
        'Prefix relation should be pruned if relation value is no prefix of query value')

      /**
       * Prefix Relation - (in)equality operators
       */

      evaluationShouldPrune(createRelation('LessThanRelation', 'zzzz'),
        createQuery('strstarts(?o, "test")'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query prefix value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query prefix value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        true,
        'LessThan relation should be pruned if relation value is equal to the query prefix value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'ssss'),
        createQuery('strstarts(?o, "test")'),
        true,
        'LessThan relation should be pruned if relation value is less than the start of the query prefix value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        false,
        'LessOrEqualThan relation should not be pruned if relation value is equal to the query prefix value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'LessOrEqualThan relation should not be pruned if relation value is greater than the query prefix value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('strstarts(?o, "te")'),
        false,
        'LessOrEqualThan relation should not be pruned if relation value is greater than the query prefix value and the query value is a prefix of the relation value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'tezt'),
        createQuery('strstarts(?o, "test")'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the next possible value of which the quert value is no prefix')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query prefix value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is greater than the query prefix value and the query value is a prefix of thre relation value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('strstarts(?o, "testing")'),
        false,
        'GreaterThanRelation relation should not be pruned if query prefix value is greater than the relation value and the query value is a prefix of thre relation value')
      evaluationShouldPrune(createRelation('GreaterThanRelation', 'zzzz'),
        createQuery('strstarts(?o, "test")'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query prefix value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'aaaa'),
        createQuery('strstarts(?o, "test")'),
        false,
        'GreaterThanRelation relation should be pruned if relation value is less than the query prefix value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query prefix value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is greater than the query prefix value and the query value is a prefix of thre relation value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('strstarts(?o, "testing")'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if query prefix value is greater than the relation value and the query value is a prefix of thre relation value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'tezt'),
        createQuery('strstarts(?o, "test")'),
        true,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is greater than the query prefix value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'zzzz'),
        createQuery('strstarts(?o, "test")'),
        true,
        'GreaterOrEqualThanRelation relation should be pruned if relation value is less than the query prefix value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('strstarts(?o, "zzzz")'),
        true,
        'EqualThanRelation relation should be pruned if relation value is greater than the next non-prefix query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'testing'),
        createQuery('strstarts(?o, "test")'),
        false,
        'EqualThanRelation relation should be pruned if the query value is a prefix of the relation value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('strstarts(?o, "test")'),
        false,
        'EqualThanRelation relation should be pruned if relation value is equal to the query prefix value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('strstarts(?o, "te")'),
        false,
        'EqualThanRelation relation should be pruned if query value is a prefix of the relation prefix value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('strstarts(?o, "s")'),
        true,
        'EqualThanRelation relation should be pruned if relation value is lesser than the query prefix value')
    }

    function testLesserThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', 'aaaa'),
        createQuery('?o < "test"'),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('?o < "test"'),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'zzzz'),
        createQuery('?o < "test"'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('?o < "test"'),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'aaaa'),
        createQuery('?o < "test"'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('?o < "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'zzzz'),
        createQuery('?o < "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('?o < "test"'),
        true,
        'GreaterOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('?o < "test"'),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }

    function testLesserOrEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', 'aaaa'),
        createQuery('?o <= "test"'),
        false,
        'LessThan relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('?o <= "test"'),
        false,
        'LessThan relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'zzzz'),
        createQuery('?o <= "test"'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('?o <= "test"'),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'aaaa'),
        createQuery('?o <= "test"'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('?o <= "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'zzzz'),
        createQuery('?o <= "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('?o <= "test"'),
        false,
        'GreaterOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('?o <= "test"'),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }
    function testGreaterThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('?o > "test"'),
        false,
        'PrefixRelation relation should not be pruned if relation value is a prefix of the query value')
      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('?o > "tezt"'),
        true,
        'PrefixRelation relation should be pruned if query value than the next non prefix value of the relation value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('?o > "test"'),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('?o > "test"'),
        true,
        'LessOrEqualThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('?o > "test"'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('?o > "test"'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('?o > "test"'),
        true,
        'EqualThanRelation relation should be pruned if relation value is equal to the query value')
    }
    function testGreaterOrEqualThan () {
      // Less tests as this uses the lesser than method

      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('?o >= "test"'),
        false,
        'PrefixRelation relation should not be pruned if relation value is a prefix of the query value')
      evaluationShouldPrune(createRelation('PrefixRelation', 'test'),
        createQuery('?o >= "tezt"'),
        true,
        'PrefixRelation relation should be pruned if query value than the next non prefix value of the relation value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('?o >= "test"'),
        true,
        'LessThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('?o >= "test"'),
        false,
        'LessOrEqualThanRelation relation should NOT be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('?o >= "test"'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('?o >= "test"'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('?o >= "test"'),
        false,
        'EqualThanRelation relation should NOT be pruned if relation value is equal to the query value')
    }

    function testEqualThan () {
      evaluationShouldPrune(createRelation('LessThanRelation', 'aaaa'),
        createQuery('?o = "test"'),
        true,
        'LessThan relation should be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQuery('?o = "test"'),
        true,
        'LessThan relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('LessThanRelation', 'zzzz'),
        createQuery('?o = "test"'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQuery('?o = "test"'),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'aaaa'),
        createQuery('?o = "test"'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQuery('?o = "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'zzzz'),
        createQuery('?o = "test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query value')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQuery('?o = "test"'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQuery('?o = "test"'),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query value')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'tes'),
        createQuery('?o = "test"'),
        true,
        'EqualThanRelation relation should be pruned if relation value is not equal to the query value')
    }

    function testLiteral () {
      evaluationShouldPrune(createRelation('LessThanRelation', 'aaaa'),
        createQueryLiteral('"test"'),
        true,
        'LessThan relation should be pruned if relation value is less than the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', 'test'),
        createQueryLiteral('"test"'),
        true,
        'LessThan relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('LessThanRelation', 'zzzz'),
        createQueryLiteral('"test"'),
        false,
        'LessThan relation should not be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('LessOrEqualThanRelation', 'test'),
        createQueryLiteral('"test"'),
        false,
        'LessOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'aaaa'),
        createQueryLiteral('"test"^^<' + xsd + 'string>'),
        false,
        'GreaterThanRelation relation should not be pruned if relation value is less than the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'test'),
        createQueryLiteral('"test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('GreaterThanRelation', 'zzzz'),
        createQueryLiteral('"test"'),
        true,
        'GreaterThanRelation relation should be pruned if relation value is greater than the query literal')

      evaluationShouldPrune(createRelation('GreaterOrEqualThanRelation', 'test'),
        createQueryLiteral('"test"'),
        false,
        'GreaterOrEqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'test'),
        createQueryLiteral('"test"'),
        false,
        'EqualThanRelation relation should not be pruned if relation value is equal to the query literal')

      evaluationShouldPrune(createRelation('EqualThanRelation', 'tes'),
        createQueryLiteral('"test"'),
        true,
        'EqualThanRelation relation should be pruned if relation value is not equal to the query literal')
    }
    testStringStarts()
    testLesserThan()
    testLesserOrEqualThan()
    testGreaterThan()
    testGreaterOrEqualThan()
    testEqualThan()
    testLiteral()
  })
