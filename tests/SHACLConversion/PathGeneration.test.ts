import 'mocha'
import Converter from '../../src/Util/Converter'
import { JsonLdParser } from 'jsonld-streaming-parser'
import * as N3 from 'n3'
import PredicatePath from '../../src/Paths/PredicatePath'
import SequencePath from '../../src/Paths/SequencePath'
import AlternativePath from '../../src/Paths/AlternativePath'
import { AssertionError } from 'assert'
import { resolve } from 'dns'
import Path from '../../src/Paths/Path'
import OneOrMorePath from '../../src/Paths/OneOrMorePath'
import { Relation, defaultContext } from '../../src/Util/Util'
import { NameSpaces } from '../../src/Util/NameSpaces'

const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const shacl = 'http://www.w3.org/ns/shacl#'
const ex = 'http://www.example.org#'

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)

// Then either:
var expect = chai.expect

describe('Testing path generation',
  () => {
    const context = {
      rdf: rdf,
      shacl: shacl,
      ex: ex
    }

    const testContext : any = defaultContext
    testContext.ex = NameSpaces.EX

    function wrapPathInRelation (path : any) {
      return {
        '@context': testContext,
        '@type': 'tree:PrefixRelation',
        'tree:path': path,
        'tree:value': 'test',
        'tree:node': 'ex:Node2.jsonld'
      }
    }
    const predicatePath = { '@id': 'rdf:label' }
    const predicatePathResult = new PredicatePath(rdf + 'label')

    const sequencePath = { [rdf + 'first']: { '@id': 'ex:first' }, [rdf + 'rest']: { [rdf + 'first']: { '@id': 'ex:second' }, [rdf + 'rest']: { [rdf + 'first']: { '@id': 'ex:third' }, [rdf + 'rest']: { '@id': rdf + 'nil' } } } }
    const sequencePathResult = new SequencePath([new PredicatePath(ex + 'first'), new PredicatePath(ex + 'second'), new PredicatePath(ex + 'third')])

    const alternativePath = { [shacl + 'alternativePath']: { [rdf + 'first']: { '@id': 'ex:first' }, [rdf + 'rest']: { [rdf + 'first']: { '@id': 'ex:second' }, [rdf + 'rest']: { '@id': rdf + 'nil' } } } }
    const alternativePathResult = new AlternativePath([new PredicatePath(ex + 'first'), new PredicatePath(ex + 'second')])

    const combinedPaths = {
      'shacl:alternativePath': {
        [rdf + 'first']: { '@id': 'ex:first_predicate' },
        [rdf + 'rest']: {
          [rdf + 'first']: {
            [rdf + 'first']: { '@id': 'ex:list_one' },
            [rdf + 'rest']: {
              [rdf + 'first']: { '@id': 'ex:list_two' },
              [rdf + 'rest']: {
                [rdf + 'first']: { '@id': 'ex:list_three' },
                [rdf + 'rest']: { '@id': rdf + 'nil' }
              }
            }
          },
          [rdf + 'rest']: { '@id': rdf + 'nil' }
        }
      }
    }
    const combinedPathsResult = new AlternativePath([new PredicatePath(ex + 'first_predicate'), new SequencePath([
      new PredicatePath(ex + 'list_one'),
      new PredicatePath(ex + 'list_two'),
      new PredicatePath(ex + 'list_three')
    ])])

    const incorrectPath = {
      'shacl:AlternativePath': {
        '@list': [
          { '@id': 'ex:predicate1' },
          { 'shacl:incorrectPath': { '@id': 'ex:predicate2' } }
        ]
      }
    }

    const inversePath = { 'shacl:inversePath': { '@id': 'ex:inversePredicate' } }
    const zeroOrOnePath = { 'shacl:zeroOrOnePath': { '@id': 'ex:zeroOrOnePredicate' } }
    const zeroOrMorePath = { 'shacl:zeroOrMorePath': { '@id': 'ex:zeroOrMorePredicate' } }
    const OneOrMorePath = { 'shacl:oneOrMorePath': { '@id': 'ex:oneOrMorePredicte' } }

    function wrapPath (path : any) {
      return { '@context': context, 'shacl:path': path }
    }

    function evaluate (relation : Relation, resultPath : Path, testComment : string) {
      it(testComment, async function () {
        await expect(await Converter.extractRelationPath(relation)).to.deep.equal(resultPath)
      })
    }

    function evaluateError (relationPath : any, errorMessage : String, testComment : string) {
      it(testComment, async function () {
        const promise = new Promise((resolve, reject) => {
          const myParser = new JsonLdParser({ context: context || undefined })
          const quads : Array<N3.Quad> = []
          myParser
            .on('data', (quad: N3.Quad) => { quads.push(quad) })
            .on('end', () => resolve(quads))

          const pathString = JSON.stringify(wrapPath(relationPath))
          myParser.write(pathString)
          myParser.end()
        })
        const resultQuads = await promise as Array<N3.Quad>
        await expect(() => Converter.convertSHACLQuadsToPath(resultQuads)).to.throw(errorMessage)
      })
    }

    function test () {
      for (const pathEntry of [[predicatePath, predicatePathResult, 'predicate path'],
        [sequencePath, sequencePathResult, 'sequence path'],
        [alternativePath, alternativePathResult, 'alternative path'],
        [combinedPaths, combinedPathsResult, 'combined paths']]) { /* zeroOrMorePath, OneOrMorePath, inversePath, */
        const comment = 'should convert ' + pathEntry[2] + ' correctly'
        evaluate(wrapPathInRelation(pathEntry[0]), pathEntry[1] as Path, comment)
      }

      evaluateError(incorrectPath, 'Path could not be parsed correctly', 'should throw error on incorrect path')

      evaluateError(inversePath, 'cannot process inverse paths', 'should throw error on unimplemented inverse path')
      evaluateError(zeroOrOnePath, 'cannot process zero or one paths', 'should throw error on unimplemented zeroOrOne path')
      evaluateError(zeroOrMorePath, 'cannot process zero or more paths', 'should throw error on unimplemented zeroOrMore path')
      evaluateError(OneOrMorePath, 'cannot process one or more paths', 'should throw error on unimplemented OneOrMore path')
    }
    test()
  }
)
