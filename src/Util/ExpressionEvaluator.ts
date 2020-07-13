import * as SPARQLJS from 'sparqljs'
import { Expression, OperationExpression, FunctionCallExpression, AggregateExpression, BgpPattern, GroupPattern, Tuple, Term } from 'sparqljs'
import { Relation } from './Util'
import VariableBinding from '../Bindings/VariableBinding'
import { evaluateOperation, bindVariableToTerm } from '../Operations';
import * as N3 from 'n3'
import { Literal } from 'rdf-js'
import UnknownValueRange from '../ValueRanges/UnknownValueRange'


export default class ExpressionEvaluator {
  static evaluateExpression (expression : SPARQLJS.Expression, relation? : Relation) : VariableBinding[] {
    let variableBindings : Array<VariableBinding> = []
    const args : VariableBinding[] = []
    // console.log('expression', expression)
    switch ((expression as any).type) {
      case 'operation':
        expression = expression as OperationExpression
        // console.log('~operation', JSON.stringify(expression, null, 2))
        for (const arg of expression.args) {
          for (const binding of this.evaluateExpression(arg)) {
            args.push(binding)
          }
        }
        variableBindings = variableBindings.concat(evaluateOperation(expression.operator, args))
        break
      case 'functionCall':
        throw new Error('Function call expressions are currently not supported')
        // console.log('~functionCall', JSON.stringify(expression, null, 2))
        // break
      case 'aggregate':
        throw new Error('Aggregate expressions are currently not supported')
        // console.log('~aggregate', JSON.stringify(expression, null, 2))
        // break
      case 'bgp':
        throw new Error('Aggregate expressions are currently not supported')
        // console.log('~bgp', JSON.stringify(expression, null, 2))
        // break
      case 'group':
        throw new Error('Group expressions are currently not supported')
        // console.log('~group', JSON.stringify(expression, null, 2))
        // break
      default:
        // Only possibility is Term or Tuple (or undefined / random)
        // We can only process Terms, so for all the rest an error is thrown.
        var term = expression as any
        if (N3.Util.isLiteral(term)) {
          return [bindVariableToTerm(undefined, term)]
        } else if (N3.Util.isNamedNode(term)) {
          return [bindVariableToTerm(undefined, term)]
        } else if (N3.Util.isVariable(term)) {
          return [new VariableBinding(term, undefined)]
        } else if (N3.Util.isBlankNode(term)) {
          throw new Error('Cannot process blank nodes in filter epxression')
        } else {
          console.log('expression', JSON.stringify(expression, null, 2))
          var exprString = (expression as any).type + ' expressions' || 'tuples'
          throw new Error(exprString + ' are currently not supported')
        }
    }
    return variableBindings
  }
}

//   static processOperation (operation: SPARQLJS.OperationExpression) {
//     switch (operation.operator) {
//       case ('='):
//         if (operation.args.length !== 2) {
//           throw new Error('= operation requires two arguments')
//         }
//         return this.evaluateExpression(operation.args[0]).equals(this.evaluateExpression(operation.args[1]))
//     }
//   }
// }

// export type Expression =
//     | OperationExpression
//     | FunctionCallExpression
//     | AggregateExpression
//     | BgpPattern
//     | GroupPattern
//     | Tuple
//     | Term;
