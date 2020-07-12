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
import PruningActor from '../../src/PruningActor'
import { Relation, defaultContext } from '../../src/Util/Util'

const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const shacl = 'http://www.w3.org/ns/shacl#'
const tree = 'https://w3id.org/tree#'
const ex = 'http://www.example.org#'
const xsd = 'http://www.w3.org/2001/XMLSchema'

describe('Testing tree pruning for queries with filters',
  () => {
    function filterShouldEvaluateTo (relation: Relation, query: string, shouldPrune: boolean, message: string) {
      it(message, async function () {
        const result = PruningActor.evaluate(query, relation)
        return expect(result).to.eventually.equal(shouldPrune)
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
        'tree:value': 'test',
        'tree:node': 'http://www.example.org#node2'
      }

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(strstarts(str(?o), "test")) \
        } LIMIT 10',
        false,
        'Prefix relation should not be pruned with matching path')

      filterShouldEvaluateTo(prefixRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?o WHERE { \
          ?s ex:predicate ?o . \
          FILTER(strstarts(str(?o), "apple")) \
        } LIMIT 10',
        true,
        'Prefix relation should be pruned with non matching path')
    }

    test()
  })
