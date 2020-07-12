Tree-specification-pruning

This library allows to prune relations based on the [TREE specification](https://github.com/TREEcg/specification).

installation:

```
npm install
```


<u>usage</u>

```
import { canPruneRelation } from 'tree-spec-pruning'

let relation = {
  '@context': 'https://w3id.org/tree#'
  '@type': 'tree:PrefixRelation'
  'path': 'http://example.com/name'
  'value': "Gent"
  'node': 'http://example.com/Node2'
}

let query = {
  'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
  PREFIX ex: <http://www.example.org#> \
  SELECT ?s WHERE { \
    ?s <http://examplecom/name> ?name ; \
    Filter(strstarts(str(?name), "Gent-")) \
  } LIMIT 10'
}

let result = canPruneRelation(relation, query)
// result = true
```

<br>
<br>


<u>Supported SHACL path types used in relations of the TREE specification</u>

| path | supported | JSON-LD example |
|------|-----------|-----------------|
| shacl:predicatePath | :heavy_check_mark: | 'shacl:path': 'ex:predicate' |
| shacl:sequencePath | :heavy_check_mark: | 'shacl:path': { 'rdf:first': 'ex:predicate1','rdf:rest': { 'rdf:first': 'ex:predicate2', 'rdf:rest': 'rdf:nil' } } |
| shacl:alternativePath | :heavy_check_mark: | 'shacl:path': { 'shacl:alternativePath': { 'rdf:first': 'ex:predicate1','rdf:rest': { 'rdf:first': 'ex:predicate2', 'rdf:rest': 'rdf:nil' } } } |
| shacl:inversePath | :heavy_multiplication_x: | { shacl:path: { 'shacl:inversePath': 'ex:predicate' } } |
| shacl:zeroOrOnePath | :heavy_multiplication_x: | { shacl:path: { 'shacl:zeroOrOnePath': 'ex:predicate' } } |
| shacl:zeroOrMorePath | :heavy_multiplication_x: | { shacl:path: { 'shacl:zeroOrMorePath': 'ex:predicate' } } |
| shacl:oneOrMorePath | :heavy_multiplication_x: | { shacl:path: { 'shacl:oneOrMorePath': 'ex:predicate' } } |

<br>
<br>

<u>Supported SPARQL path expressions that will enable tree pruning</u>

| path | supported | JSON-LD example |
|------|-----------|-----------------|
| predicate path | :heavy_check_mark: | ex:predicate |
| sequence path | :heavy_check_mark: | ex:predicate1 / ex:predicate2|
| alternative path | :heavy_check_mark: | ex:predicate1 \| ex:predicate2 |
| inverse path | :heavy_multiplication_x: | ^ex:predicate |
| zero or one path | :heavy_multiplication_x: | ex:predicate? |
| zero or more path | :heavy_multiplication_x: | ex:predicate* |
| one or more path | :heavy_multiplication_x: | ex:predicate+ |

<br>
<br>


<u>Pruning rules</u><br>
(shacl paths written in sparql path syntax for visual clarity!)

| relation path | SPARQL query path | can prune relation|
|------|-----------|-----------------|
| ex:predicate | ex:predicate | :heavy_check_mark: |
| ex:predicate1 | ex:predicate2 | :heavy_multiplication_x: |
| ex:predicate1 / ex:predicate2 / ex:predicate3 | ex:predicate1 / ex:predicate2 / ex:predicate3 | :heavy_check_mark: |
| ex:predicate2 / ex:predicate3 | ex:predicate1 / ex:predicate2 / ex:predicate3 | :heavy_multiplication_x: |
| ex:predicate1 / ex:predicate2 / ex:predicate3 | ex:predicate2 / ex:predicate3 | :heavy_multiplication_x: |
| ex:predicate1 / ex:predicate2 / ex:predicate3 | ex:predicate4 / ex:predicate2 / ex:predicate3 | :heavy_multiplication_x: |
| ex:predicate1 \| ex:predicate2 | ex:predicate1 \| ex:predicate2 | :heavy_check_mark: |
| ex:predicate1 | ex:predicate1 \| ex:predicate2 | :heavy_multiplication_x: |
| ex:predicate2 | ex:predicate1 \| ex:predicate2 | :heavy_multiplication_x: |
| ex:predicate1 \| ex:predicate2 | ex:predicate1 | :heavy_multiplication_x: |
| ex:predicate1 \| ex:predicate2 | ex:predicate2 | :heavy_multiplication_x: |

<u>Notes on pruning rules</u>
In the case of sequence paths, a relation can only be pruned if it exactly matches the path of a query.
In case the query path is more specific than the relation path: e.g. we query for items with a specific value for a path ```ex:city / rdf:label```, we cannot prune a relation with a path ```rdf:label```, as this may contain items with a ```ex:streetname / rdf:label``` property, over which no assumptions can be made.
In the case the relation path is more specific than the query path: e.g. we query for items for a path ```rdf:label```, a relations with a path ```ex:city / rdf:label``` cannot be pruned, as it an item may contain both properties ```ex:city / rdf:label``` and ```ex:streetname / rdf:label```, and we cannot make any assumptions over the value of the streetname label, so this relation can not be pruned.
Combining both these findings, we can decide that only exact matches in the query path and relation path allow for a relation to be pruned.

In the case of alternative path, we do not entirely follow the [SPARQL specification for property paths](https://www.w3.org/TR/sparql11-property-paths/), that dictates that all possibilities should be tried. This would have as a consequence that when querying for items with a path ```rdf:label | foaf:name```, a relation with a path ```rdf:label``` cannot be pruned, as it may contain items with a ```foaf:name``` property that does match the given query. 
Instead, we process an alternative path by trying to match the different paths one by one, from left to right.

<strike>
If however in a relation an alternative path is specified, this relation can only be pruned in the case that the query also specifies an alternative path where all possible paths of specified int the relation are also specified in the query.
If this is not the case: e.g. The relation specifies a path ```rdf:label | foaf:name```, and the query searches for items matching a value for ```rdf:label```, then we cannot prune this relation, as we have no guarantee that an 
</strike>


<u>Supported SPARQL filter expressions</u><br>
As SPARQL is an extensive framework, we currently only support a small subset of the filtering functionality that is available to decide whether to prune a relation.
This functionality is based on the current relations that are defined in the [TREE Specification](https://github.com/TREEcg/specification), and which filter options are relevant to prune relations during the traversal of a search tree.


<u>Type conversions</u><br>
Implementation according to [SPARQL1.1 spec](https://www.w3.org/TR/sparql11-query/#FunctionMapping)<br>
:heavy_check_mark: implemented<br>
:heavy_multiplication_x: not implemented / impossible<br>
:question: dependent on lexical value

| From \ To| xsd:string | xsd:decimal | xsd:int | xsd:float | xsd:double | xsd:dateTime | xsd:boolean |
|--|--|--|--|--|--|--|--|
| xsd:string    | :heavy_check_mark: |  :question: |  :question: |  :question: |  :question: |  :question: |  :question: |
| xsd:decimal   | :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_check_mark: |
| xsd:int       | :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_check_mark: |
| xsd:float     | :heavy_check_mark: |  :question: |  :question: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_check_mark: |
| xsd:double    | :heavy_check_mark: |  :question: |  :question: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_check_mark: |
| xsd:dateTime  | :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_check_mark: |  :heavy_multiplication_x: |
| xsd:boolean   | :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_check_mark: |
| IRI           | :heavy_check_mark: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |  :heavy_multiplication_x: |
| simple literal| :heavy_check_mark: |  :question: |  :question: |  :question: |  :question: |  :question: |  :question: |


<u>Implemented functions and compatibility</u><br>
<!-- The operators ```+, -, <, <=, =, =>, >```and their interactions with the literal types are implemented according to SPARQL spec. -->

| datatype \ Compatible relation | PrefixRelation | SubstringRelation | LesserThanRelation | LesserThanOrEqualRelation | EqualsRelation | GreaterOrEqualThanRelation | GreaterThanRelation | GeospatiallyContainsRelation |
|--|--|--|--|--|--|--|--|--|
| xsd:string |
| 




Support for UNION is currently not yet implemented.