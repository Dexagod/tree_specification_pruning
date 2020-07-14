/* eslint-disable no-multi-str */
import { expect } from 'chai'
import 'mocha'
import Converter from '../../src/Util/Converter'
import { JsonLdParser } from 'jsonld-streaming-parser'
import * as N3 from 'n3'
import PredicatePath from '../../src/Paths/PredicatePath'
import SequencePath from '../../src/Paths/SequencePath'
import AlternativePath from '../../src/Paths/AlternativePath'
import { AssertionError, match } from 'assert'
import { resolve } from 'dns'
import { NameSpaces } from '../../src/Util/NameSpaces'
import { Relation } from '../../src/Util/Util'
import { processPatterns } from '../../src/pruning'

const rdf = NameSpaces.RDF
const shacl = NameSpaces.SHACL
const tree = NameSpaces.TREE
const ex = NameSpaces.EX
const xsd = NameSpaces.XSD

describe('Testing path matching',
  () => {
    async function QueryShouldEvaluateTo (relation : Relation, query: string, term: N3.Term | null, message: string) {
      it(message, async function () {
        // Expect the query to match the relation, and return the term at the end of the path
        const relationPath = await Converter.extractRelationPath(relation)
        if (!relationPath) return expect(relationPath).to.be.not.null
        const patterns = await processPatterns(query, relationPath, relation)
        // First we extract the available BGPs from the query that were processed
        const bgp : any = patterns?.filter((e : any) => { return e.type === 'bgp' })
        // We expect there to be one such pattern in these tests
        await expect(bgp).to.be.not.null
        await expect(bgp).to.not.be.undefined
        expect(bgp.length).to.equal(1)
        // We expect this pattern to match only for a single term
        expect(bgp[0].matches.length).to.equal(1)
        // We expect this pattern to match a specific given term
        expect(bgp[0].matches[0]).to.deep.equal(term)
      })
    }

    function QueryShouldErrorWith (relation : Relation, query: string, errorMessage: string, message: string) {
      it(message, async function () {
        const relationPath = await Converter.extractRelationPath(relation)
        if (!relationPath) return expect(relationPath).to.be.not.null
        // Expect the processing of the parse tree to error, as the paths of the relation and BGP do not match.
        expect(() => processPatterns(query, relationPath, relation)).to.throw(errorMessage)
      })
    }

    function test () {
      const context = {
        rdf: rdf,
        shacl: shacl,
        tree: tree,
        ex: ex
      }

      const predicateRelation : Relation = {
        '@context': context,
        '@type': 'PrefixRelation',
        'tree:path': { '@id': 'ex:predicate' },
        'tree:value': 'Test',
        'tree:node': 'http://www.example.org#node2'
      }

      const sequenceRelation : Relation = {
        '@context': context,
        '@type': 'PrefixRelation',
        'tree:path': {
          [rdf + 'first']: { '@id': 'ex:first' },
          [rdf + 'rest']: {
            [rdf + 'first']: { '@id': 'ex:second' },
            [rdf + 'rest']: {
              [rdf + 'first']: { '@id': 'ex:third' },
              [rdf + 'rest']: { '@id': rdf + 'nil' }
            }
          }
        },
        'tree:value': 'Test',
        'tree:node': 'http://www.example.org#node2'
      }

      const alternativeRelation : Relation = {
        '@context': context,
        '@type': 'PrefixRelation',
        'tree:path': {
          [shacl + 'alternativePath']: {
            [rdf + 'first']: { '@id': 'ex:first' },
            [rdf + 'rest']: {
              [rdf + 'first']: { '@id': 'ex:second' },
              [rdf + 'rest']: {
                [rdf + 'first']: { '@id': 'ex:third' },
                [rdf + 'rest']: { '@id': rdf + 'nil' }
              }
            }
          }
        },
        'tree:value': 'Test',
        'tree:node': 'http://www.example.org#node2'
      }

      // Test matching paths with different queries

      QueryShouldEvaluateTo(predicateRelation,
        'SELECT ?s ?o WHERE { \
          ?s <http://www.example.org#predicate> ?o . \
        } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation predicate path equals query predicate path')

      QueryShouldErrorWith(predicateRelation,
        'SELECT ?s ?o WHERE { \
          ?s <http://www.example.org#predicate1> ?temp . \
          ?temp <http://www.example.org#predicate> ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation predicate path does not equal query predicate path')

      QueryShouldEvaluateTo(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?o WHERE { \
          ?s ex:first / ex:second / ex:third ?o . \
        } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation sequence path equals query sequence path')

      QueryShouldEvaluateTo(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?o WHERE { \
          ?s ex:first / ex:second ?temp .\
          ?temp ex:third ?o . \
        } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation sequence path equals query sequence path + predicate path')

      QueryShouldEvaluateTo(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first ?temp1 .\
          ?temp1 ex:second ?temp2 .\
          ?temp2 ex:third ?o . \
        } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation sequence path equals sequence of query predicate paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first / ex:third / ex:second ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path is ordered differently than query sequence paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first / ex:second ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path is a superset of query sequence paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:start / ex:first / ex:second / ex:third ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path has different start than query sequence paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:start ?temp . \
          ?temp ex:first / ex:second / ex:third ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path has different start than query sequence paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first / ex:second / ex:third /ex:fourth ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path has different end than query sequence paths')

      QueryShouldErrorWith(sequenceRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first / ex:second / ex:third ?temp . \
          ?temp ex:fourth ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation sequence path has different end than query sequence paths')

      QueryShouldEvaluateTo(alternativeRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first | ex:second | ex:third ?o . \
        } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation altenative path equals query alternative path')

      QueryShouldEvaluateTo(alternativeRelation,
        'PREFIX ex: <http://www.example.org#> \
          SELECT ?s ?0 WHERE { \
            ?s ex:first | ex:second | ex:third ?o . \
          } LIMIT 10',
        N3.DataFactory.variable('o'),
        'should be able to match path if relation altenative path has same options in different order to query alternative path')

      QueryShouldErrorWith(alternativeRelation,
        'PREFIX ex: <http://www.example.org#> \
          SELECT ?s ?0 WHERE { \
            ?s ex:first | ex:third | ex:fourth ?o . \
          } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation altenative path has different options than query alternative path')

      QueryShouldErrorWith(alternativeRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first | ex:second | ex:third | ex:fourth ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation altenative path has more options than query alternative path')

      QueryShouldErrorWith(alternativeRelation,
        'PREFIX ex: <http://www.example.org#> \
        SELECT ?s ?0 WHERE { \
          ?s ex:first | ex:second ?o . \
        } LIMIT 10',
        'No complete matching path was found for the given query',
        'should not be able to match path if relation altenative path has less options than query alternative path')

      // SHould result in literals
      QueryShouldEvaluateTo(predicateRelation,
        'SELECT ?s ?o WHERE { \
          ?s <http://www.example.org#predicate> "StringLiteral" . \
        } LIMIT 10',
        N3.DataFactory.literal('StringLiteral', N3.DataFactory.namedNode(xsd + 'string')),
        'should be able to match path if relation predicate path equals query predicate path')

      QueryShouldEvaluateTo(predicateRelation,
        'SELECT ?s ?o WHERE { \
          ?s <http://www.example.org#predicate> "StringLiteral"^^<' + xsd + 'string> . \
        } LIMIT 10',
        N3.DataFactory.literal('StringLiteral', N3.DataFactory.namedNode(xsd + 'string')),
        'should be able to match path if relation predicate path equals query predicate path')
    }
    test()
  })
