# Operations

This readme gives an overview to how expressions are handled by different operators.
Expressions are evaluated to a VariableBinding objects.
These consist of a possible Variable object and a possible ValueRange object.
A ValueRange object keeps track of the possible range of values that a variable can have (and if the start and end are inclusive).
Based on this range of values, we can decide to prune a relation with a given value.
e.g. if an expression returns a VariableBinding with a ValueRange: {start: 'a', end: 'b', datatype: STRING, startincl: false, endincl: false}, 
then we know that a GreaterThanRelation with value 'c' cannot return results for our query, and can be pruned.
A LesserThanRelation with value 'c' can provide usefull results, and can therefore not be pruned.

In case an expresion could not be processed, the default is to NOT prune relations, as we can make no assumptions then over the data that can be found by following the relation.


Now we will look at the operators, and the results from the operation based on the passed arguments

| bracket | meaning|
|--------:|:-------|
| [a or a] | a is included |
| ]a or a[ | a is not included |
| \|a or a\| | inclusivity is equal to passed valuerange |
| !a or a! | inclusivity is reverse of passed inclusivity |

In the case of comparison operations where one of both arguments is null, these are handled as respectively -INF and INF.

### LesserThan (<)

| var \ val range \| | null, null | \|a, b\|, null | null, \|c, d\| | \|a, b\|, \|c, d\| |
|-------------------:|:----------:|:--------------:|:--------------:|:------------------:|
| null, null |:heavy_multiplication_x:|:heavy_multiplication_x:|:heavy_multiplication_x:|:heavy_multiplication_x:|
| ?s , null |:heavy_multiplication_x:|:heavy_multiplication_x:| <b> ?s: ]null, c! </b> | <b> if(b<c) ?s: \|a,b\| else ?s: \|a,c! </b> |
| null, ?r |:heavy_multiplication_x:|<b> ?r: !b, null[ </b> |:heavy_multiplication_x:  | <b> if(b<c) ?r: \|c,d\| else ?r: !b,d\| </b> |
| (result 1) ?s , ?r | <b> ?s: ]null, ?r[ </b> | <b> ?s: \|a, b\| </b> | <b> ?s: ]null, c! </b> | <b> if(b<c) ?s: \|a,b\| else ?s: \|a,c! </b> |
| (result 2) ?s , ?r | <b> ?r: ]?s, null[ </b> | <b> ?r: !b, null[ </b> | <b> ?r: \|c, d\| </b> |<b> if(b<c) ?r: \|c,d\| else ?r: !b,d\| </b> |

### LesserThanOrEqual (≤)

| var \ val range \| | null, null | \|a, b\|, null | null, \|c, d\| | \|a, b\|, \|c, d\| |
|-------------------:|:----------:|:--------------:|:--------------:|:------------------:|
| null, null |:heavy_multiplication_x:|:heavy_multiplication_x:|:heavy_multiplication_x:|:heavy_multiplication_x:|
| ?s , null |:heavy_multiplication_x:|:heavy_multiplication_x:| <b> ?s: ]null, c] </b> | <b> if(b≤c) ?s: \|a,b] else ?s: \|a,c] </b> |
| null, ?r |:heavy_multiplication_x:|<b> ?r: [b, null[ </b> |:heavy_multiplication_x:  | <b> if(b≤c) ?r: \|c,d\| else ?r: [b,d\| </b> |
| (result 1) ?s , ?r | <b> ?s: ]null, ?r] </b> | <b> ?s: \|a, b\| </b> | <b> ?s: ]null, c] </b> | <b> if(b≤c) ?s: \|a,b\| else ?s: \|a,c] </b> |
| (result 2) ?s , ?r | <b> ?r: [?s, null[ </b> | <b> ?r: [b, null[ </b> | <b> ?r: \|c, d\| </b> |<b> if(b≤c) ?r: \|c,d\| else ?r: [b,d\| </b> |

### GreaterThan (>)
We convert this function to LesserThan:
**a > b -> b < a**
therefore operation (>, leftArg, rightArg) === operation(<, rightArg, leftArg)

### GreaterThanOrEqual (≥)
We convert this function to LesserThanOrEqual:
**a ≥ b -> b ≤ a**
therefore operation (≥, leftArg, rightArg) === operation(≤, rightArg, leftArg)