import { expect } from 'chai'
import 'mocha'
import Converter, { Relation, defaultContext } from '../src/Util/Converter'
import { JsonLdParser } from 'jsonld-streaming-parser'
import * as N3 from 'n3'
import PredicatePath from '../src/Paths/PredicatePath'
import SequencePath from '../src/Paths/SequencePath'
import AlternatePath from '../src/Paths/AlternatePath'
import { AssertionError } from 'assert'
import { resolve } from 'dns'

const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const shacl = 'http://www.w3.org/ns/shacl#'
const ex = 'http://www.example.org/#'

describe('Parsing shacl paths',
  () => {
    const context = {
      rdf: rdf,
      shacl: shacl,
      ex: ex
    }
    const predicatePath = 'rdf:label'
    const predicatePathResult = new PredicatePath('rdf:label')

    const sequencePath = { [rdf + 'first']: 'ex:first', [rdf + 'rest']: { [rdf + 'first']: 'ex:second', [rdf + 'rest']: { [rdf + 'first']: 'ex:third', [rdf + 'rest']: rdf + 'nil' } } }
    const sequencePathResult = new SequencePath([new PredicatePath('ex:first'), new PredicatePath('ex:second'), new PredicatePath('ex:third')])

    const alternatePath = { [shacl + 'alternatePath']: { [rdf + 'first']: 'ex:first', [rdf + 'rest']: { [rdf + 'first']: 'ex:second', [rdf + 'rest']: rdf + 'nil' } } }
    const alternatePathResult = new AlternatePath([new PredicatePath('ex:first'), new PredicatePath('ex:second')])

    const combinedPaths = {
      'shacl:alternatePath': {
        [rdf + 'first']: 'ex:first_predicate',
        [rdf + 'rest']: {
          [rdf + 'first']: {
            [rdf + 'first']: 'ex:list_one',
            [rdf + 'rest']: {
              [rdf + 'first']: 'ex:list_two',
              [rdf + 'rest']: {
                [rdf + 'first']: 'ex:list_three',
                [rdf + 'rest']: rdf + 'nil'
              }
            }
          },
          [rdf + 'rest']: rdf + 'nil'
        }
      }
    }
    const combinedPathsResult = new AlternatePath([new PredicatePath('ex:first_predicate'), new SequencePath([new PredicatePath('ex:list_one'), new PredicatePath('ex:list_two'), new PredicatePath('ex:list_three')])])

    // const inversePath = { 'shacl:inversePath': { '@id': 'ex:reversePredicte' } }
    // const zeroOrMorePath = { 'shacl:zeroOrMorePath': { '@id': 'ex:zeroOrMorePredicate' } }
    // const OneOrMorePath = { 'shacl:oneOrMorePath': { '@id': 'ex:oneOrMorePredicte' } }

    // const combinedPaths = {
    //   'shacl:AlternatePath': {
    //     '@list': [
    //       {
    //         '@list': [
    //           { '@id': 'ex:predicate1' },
    //           { 'shacl:inversePath': { '@id': 'ex:predicate2' } },
    //           { 'shacl:oneOrMorePath': { '@id': 'ex:predicate3' } },
    //           { 'shacl:zeroOrMorePath': { '@id': 'ex:predicate4' } }
    //         ]
    //       },
    //       { 'sh:oneOrMorePath': { '@id': 'ex:predicate5' } }
    //     ]
    //   }
    // }

    const incorrectPath = {
      'shacl:AlternatePath': {
        '@list': [
          { '@id': 'ex:predicate1' },
          { 'shacl:incorrectPath': { '@id': 'ex:predicate2' } }
        ]
      }
    }

    function wrapPath (path : any) {
      return { '@context': context, 'shacl:path': path }
    }
    const predicateQuery =
    // eslint-disable-next-line no-multi-str
    'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
    PREFIX ex: <http://www.example.org#> \
    SELECT ?s ?namelabel WHERE { \
      ?s ^<http://www.w3.org/2000/01/rdf-schema#label> ?namelabel ; \
      rdf:label+ ?namelabel2 ; \
      <http://www.w3.org/2000/01/rdf-schema#label> | ex:label ?namelabel3 ; \
      rdf:testpredicate1 / rdf:testpredicate2  <https://data.vlaanderen.be/ns/adres#Gemeentenaam>. \
      ?namelabel   rdf:type <https://data.vlaanderen.be/ns/adres#Gemeentenaam> . \
      ?a ex:test1 ?b. \
      ?c ex:test2 ?d. \
      Filter(strstarts(str(?namelabel), "Gen")) \
    } LIMIT 10'

    it('should parse predicate paths', async function () {
      for (const pathEntry of [[predicatePath, predicatePathResult], [sequencePath, sequencePathResult], [alternatePath, alternatePathResult], [combinedPaths, combinedPathsResult]]) { /* zeroOrMorePath, OneOrMorePath, inversePath, */
        const path = pathEntry[0]
        const pathResult = pathEntry[1]
        const promise = new Promise((resolve, reject) => {
          const myParser = new JsonLdParser()
          const quads : Array<N3.Quad> = []
          myParser
            .on('data', (quad: N3.Quad) => { quads.push(quad) })
            .on('end', () => resolve(quads))

          const pathString = JSON.stringify(wrapPath(path))
          myParser.write(pathString)
          myParser.end()
        })
        const result = await Converter.convertQuadsToPath(await promise as Array<N3.Quad>)
        const singleResult = result?.get(Array.from(result.keys())[0])
        expect(singleResult).to.deep.equal(pathResult)
      }
    })

    it('should fail on incorrect paths', async function () {
      for (const shaclPath of [incorrectPath]) {
        const promise = new Promise((resolve, reject) => {
          const myParser = new JsonLdParser()
          const quads : Array<any> = []
          myParser
            .on('data', quad => { quads.push(quad) })
            .on('end', async () => {
              resolve(quads)
            })

          const pathString = JSON.stringify(wrapPath(shaclPath))
          myParser.write(pathString)
          myParser.end()
        })
        const quads : any = await promise
        expect(() => Converter.convertQuadsToPath(quads)).to.throw()
      }
      return null
    })

    it('should parse SPARQL QUERIES paths', async function () {
      const relation : Relation = {
        '@context': defaultContext,
        '@type': 'GreaterThanRelation',
        'tree:node': 'node1',
        'tree:value': 'value',
        'tree:path': predicatePath
      }
      console.log('sparql queries')
      const result = await Converter.canPruneRelation(relation, predicateQuery)
      console.log(require('util').inspect(result, false, null, true))
    })
  })
