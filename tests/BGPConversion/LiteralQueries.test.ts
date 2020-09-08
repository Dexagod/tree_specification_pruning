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
import { Literal } from 'rdf-js'

const rdf = NameSpaces.RDF
const shacl = NameSpaces.SHACL
const tree = NameSpaces.TREE
const ex = NameSpaces.EX
const xsd = NameSpaces.XSD

describe('Testing tree pruning for bgps ending in a literal value',
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

    function createRelation (type: string, value: Literal): Relation {
      return {
        '@context': context,
        '@type': tree + type,
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': value,
        'tree:node': 'http://www.example.org#node2'
      }
    }

    function createQueryLiteral (literal: string) : string {
      return ('PREFIX ex: <http://www.example.org#> \
      SELECT ?s WHERE { ?s ex:predicate ' + literal + ' } LIMIT 10')
    }

    function test () {
      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('aaaa')),
        createQueryLiteral('"test"'),
        true,
        'Relation should be pruned when bgp path ends in literal and relation can be pruned')

      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('test')),
        createQueryLiteral('"test"'),
        false,
        'Relation should not be pruned when bgp path ends in literal and relation can not be pruned')
    }
    test()
  })
