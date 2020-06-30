import Converter from './Util/Converter'

export default class Matcher {
  constructor (sparqlQuery: string) {
    let subjectMap = Converter.convertSparqlToPath(sparqlQuery)
  }

  matchConstraints (relations : Array<any>, context: any, datafactory: any) {
  }
}

// export default class Matcher {
//   parser = new SPARQLJS.Parser();
//   generator = new SPARQLJS.Generator();

//   matchConstraints(sparql_query : string, relations : Array<any>, context: any, datafactory: any){
//     let parsedQuery;
//     let results = []
//     for (let relation of relations){
//       let path = relation['tree:path']
//       if(!path) results.push(true);
//       else {
//         if (!parsedQuery) parsedQuery = this.parser.parse(sparql_query);
//         console.log(require('util').inspect(parsedQuery, false, null, true))
//         results.push(this.matchPathAndQuery(parsedQuery, path))

//       }
//     }

//     // var generatedQuery = this.generator.stringify(parsedQuery);
//   }

//   generateSparqlTree(query: SPARQLJS.SparqlQuery){
//     query = query as SPARQLJS.Query
//     if( !query.where ) return;
//     for (let pattern of query.where) {
//       if (pattern.type === 'bgp') {
//         for (let triple of pattern.triples) {
//           let predicate : any = triple.predicate;
//           if(predicate.type === "path"){
//             let type = predicate.pathType
//           } else {
//             // Matches a predicate path
//             predicate = triple.predicate as SPARQLJS.Term

//           }
//         }
//       }
//     }
//   }

//   matchPathAndQuery(query: SPARQLJS.SparqlQuery, path: any){
//     query = query as SPARQLJS.Query
//     if( !query.where ) return;
//     for (let pattern of query.where) {
//       if (pattern.type === 'bgp') {
//         for (let triple of pattern.triples) {
//           let predicate = triple.predicate as SPARQLJS.PropertyPath
//           if(predicate.type === "path"){
//             // Matches a special path
//             let type = predicate.pathType

//           } else {
//             // Matches a predicate path
//             let predicate = triple.predicate as SPARQLJS.Term
//           }
//         }
//       }
//     }
//     // for (let triple of query.where){
//     //
//     // }
//     let queryTree = query;
//     // Create tree of query
//     // create tree of path
//     // run through query tree
//     // check if path can be completed
//     // if path can be completed -> check end of path

//   }
// }/* prefixes, baseIRI, factory */

const queryString =
// eslint-disable-next-line no-multi-str
'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
PREFIX ex: <http://www.example.org#> \
SELECT ?s ?namelabel WHERE { \
  ?s ^<http://www.w3.org/2000/01/rdf-schema#label> ?namelabel ; \
  <http://www.w3.org/2000/01/rdf-schema#label>+ ?namelabel2 ; \
  <http://www.w3.org/2000/01/rdf-schema#label> ?namelabel3 ; \
  rdf:type <https://data.vlaanderen.be/ns/adres#Gemeentenaam> . \
  ?namelabel   rdf:type <https://data.vlaanderen.be/ns/adres#Gemeentenaam> . \
  ?a ex:test1 ?b. \
  ?c ex:test2 ?d. \
  Filter(strstarts(str(?namelabel), "Gen")) \
} LIMIT 10'

const relation1 = {
  '@type': 'tree:GreaterThanRelation',
  'tree:path': 'http://www.w3.org/2000/01/rdf-schema#label',
  'tree:node': 'mypage#Node1',
  'tree:value': 'Ga'
}

const relation2 = {
  '@type': 'tree:LesserThanRelation',
  'tree:node': 'mypage#Node1',
  'tree:value': 'Gu'
}

// /**
// *
// * THE FULL PATH MUST BE PRESENT IN THE SPARQL QUERY
// * IF IT ENDS IN A VARIABLE, check for FILTERS on that variable
// * else, only follow relations that adhere to the literal value.
// * in case in ends in a blank node / iri -. situational
// *
// * so: MATCH path to sparql query
// *
// * path subset of sparql        ->      prune
// * sparql subset of path        ->      not prune
// * sparql same ending as path   ->      not prune

// 1 ------------- path subset of sparql ----------------

// select * where
// ?s ex:city _:city.
// _:city geo:pos _:pos
// _:pos geo:WKT ?WKT

// tree:path [geo:pos, geo:WKT0]

// RESULT -> PRUNE !!!!!!

// 2 ------------- sparql subset of path ----------------

// select * where
// ?city geo:pos _:pos
// _:pos geo:WKT ?WKT

// tree:path [ex:city, geo:pos, geo:WKT0]

// RESULT -> NOT PRUNING

// 2 ------------- sparql and path same ending ----------------

// select * where
// ?s ex:city _:city.
// _:city geo:pos _:pos
// _:pos geo:WKT ?WKT

// tree:path [ex:street, geo:pos, geo:WKT0]

// RESULT -> NOT PRUNING

// */
