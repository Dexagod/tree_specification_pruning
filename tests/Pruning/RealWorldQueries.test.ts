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

describe('Testing tree pruning for elaborate queries and relations',
  () => {
    function evaluationShouldPrune (relation: Relation, query: string, shouldPrune: boolean, message: string) {
      it(message, async function () {
        const result = evaluate(query, relation)
        return expect(result).to.eventually.equal(shouldPrune)
      })
    }

    const context = {
      rdf: rdf,
      shacl: shacl,
      tree: tree,
      ex: ex,
      xsd: xsd
    }

    function createRelation (type: string, value: Literal, path = 'ex:predicate'): Relation {
      return {
        '@context': context,
        '@type': tree + type,
        'tree:path': { '@id': path },
        'tree:value': value,
        'tree:node': 'http://www.example.org#node2'
      }
    }

    function test () {
      // Find all street names that start with 'Gent' in the address registry of Flanders
      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('Ge'), 'http://www.w3.org/2000/01/rdf-schema#label'),
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
        PREFIX dcterms: <http://purl.org/dc/terms/> \
        SELECT distinct ?s ?o WHERE { \
          ?version rdfs:label ?o; \
             dcterms:isVersionOf ?s . \
          FILTER(strstarts(?o, "Gent"))}',
        false,
        'relation should not be pruned if relation path results in a matching prefix value for a prefix relation.')

      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('Br'), 'http://www.w3.org/2000/01/rdf-schema#label'),
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
        PREFIX dcterms: <http://purl.org/dc/terms/> \
        SELECT distinct ?s ?o WHERE { \
        ?version rdfs:label ?o; \
           dcterms:isVersionOf ?s . \
        FILTER(strstarts(?o, "Gent"))}',
        true,
        'relation should be pruned if relation path results in non-matching prefix value for a prefix relation')

      // Select all postal names where the postal code is 9620
      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('50'), 'https://data.vlaanderen.be/ns/adres#postcode'),
        'PREFIX dcterms: <http://purl.org/dc/terms/> \
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        select ?postcode ?postNaam WHERE { \
          ?postcodeVersion <https://data.vlaanderen.be/ns/adres#postcode> "5000"^^xsd:integer ; \
            dcterms:isVersionOf ?postcode ; \
          <https://data.vlaanderen.be/ns/adres#postnaam> ?postNaam . \
        } \
        LIMIT 10',
        false,
        'relation should not be pruned if relation path results in a matching prefix value for a prefix relation, when making the conversion from integer to string')

      // Select all postal names where the postal code is 9620
      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('50', N3.DataFactory.namedNode(NameSpaces.XSD + 'integer')), 'https://data.vlaanderen.be/ns/adres#postcode'),
        'PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      select ?postcode ?postNaam WHERE { \
        ?postcodeVersion <https://data.vlaanderen.be/ns/adres#postcode> "5000"^^xsd:integer ; \
          dcterms:isVersionOf ?postcode ; \
        <https://data.vlaanderen.be/ns/adres#postnaam> ?postNaam . \
      } \
      LIMIT 10',
        false,
        'relation should not be pruned if relation path results in a matching prefix value for a prefix relation, even when the prefix relation is using an integer datatype.')

      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('60'), 'https://data.vlaanderen.be/ns/adres#postcode'),
        'PREFIX dcterms: <http://purl.org/dc/terms/> \
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        select ?postcode ?postNaam WHERE { \
          ?postcodeVersion <https://data.vlaanderen.be/ns/adres#postcode> "5000"^^xsd:integer ; \
            dcterms:isVersionOf ?postcode ; \
          <https://data.vlaanderen.be/ns/adres#postnaam> ?postNaam . \
        } \
        LIMIT 10',
        true,
        'relation should be pruned if relation path results in a non-matching prefix value for a prefix relation, when making the conversion from integer to string')

      evaluationShouldPrune(createRelation('PrefixRelation', N3.DataFactory.literal('60', N3.DataFactory.namedNode(NameSpaces.XSD + 'integer')), 'https://data.vlaanderen.be/ns/adres#postcode'),
        'PREFIX dcterms: <http://purl.org/dc/terms/> \
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        select ?postcode ?postNaam WHERE { \
          ?postcodeVersion <https://data.vlaanderen.be/ns/adres#postcode> "5000"^^xsd:integer ; \
            dcterms:isVersionOf ?postcode ; \
          <https://data.vlaanderen.be/ns/adres#postnaam> ?postNaam . \
        } \
        LIMIT 10',
        true,
        'relation should be pruned if relation path results in a non-matching prefix value for a prefix relation when relation value datatype is also an integer')
    }
    test()
  })
