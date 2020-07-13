import VariableBinding from './Bindings/VariableBinding'
import { Literal, Variable, NamedNode, BlankNode } from 'rdf-js'
import * as N3 from 'n3'
import { DataType, castDataType } from './Util/DataTypes'
import { NameSpaces } from './Util/NameSpaces'
import UnknownValueRange from './ValueRanges/UnknownValueRange'
import StringValueRange from './ValueRanges/StringValueRange'
import DateTimeValueRange from './ValueRanges/DateTimeValueRange'
import NumberValueRange from './ValueRanges/NumberValueRange'
import ValueRange from './ValueRanges/ValueRange'
import LocationValueRange from './ValueRanges/LocationValueRange'

const xsd = NameSpaces.XSD

// TODO:: String locale comparisons

export function evaluateOperation (operator: string, args: VariableBinding[]) {
  const operation = (operandMapping as any)[operator]
  if (!operation) throw getOperandNotImplementedError(operator)
  return operation(...args)
}

function getIncorrectNumberOfOperandsError (operand: string) {
  return new Error('Incorrect number of parameters for ' + operand + ' operand.')
}

function getIncorrectArgumentsError (operand: string, left: VariableBinding, right: VariableBinding) {
  return new Error('Could not process ' + operand + ' operator with arguments: ' + JSON.stringify(left, null, 2) + ' , ' + JSON.stringify(right, null, 2))
}

function getOperandNotImplementedError (operand: string) {
  return new Error('Operand ' + operand + ' is not yet implemented.')
}

// Operand processing
function not (left: VariableBinding, right: VariableBinding) {
  throw getOperandNotImplementedError('!')
}
function unaryPlus (binding: VariableBinding) {

}
function unaryMinus (binding: VariableBinding) {}
function addition (left: VariableBinding, right: VariableBinding) {}
function subtraction (left: VariableBinding, right: VariableBinding) {}
function multiplication (left: VariableBinding, right: VariableBinding) {}
function division (left: VariableBinding, right: VariableBinding) {}
function equality (left: VariableBinding, right: VariableBinding) {}
function inequality (left: VariableBinding, right: VariableBinding) {}

function checkInequalityArguments (operator: string, left: VariableBinding, right: VariableBinding) : void {
  if (!left || !right) throw getIncorrectNumberOfOperandsError(operator)
  if (!left.variable && !right.variable) throw getIncorrectArgumentsError(operator, left, right)
  if (!left.valueRange && !right.valueRange && (!left.variable || !right.variable)) throw getIncorrectArgumentsError(operator, left, right)
  if (!left.variable && !left.valueRange) throw getIncorrectArgumentsError(operator, left, right)
  if (!right.variable && !right.valueRange) throw getIncorrectArgumentsError(operator, left, right)
}

function getResultNumberType (d1 : DataType, d2: DataType) {
  if (d1 === DataType.DOUBLE || d2 === DataType.DOUBLE) return DataType.DOUBLE
  if (d1 === DataType.FLOAT || d2 === DataType.FLOAT) return DataType.FLOAT
  if (d1 === DataType.INTEGER || d2 === DataType.INTEGER) return DataType.INTEGER
  if (d1 === DataType.DECIMAL || d2 === DataType.DECIMAL) return DataType.DECIMAL
}

/**
 * Lesser Than Operator
 * @param left : Left VariableBinding
 * @param right : Right VariableBinding
 * @param reverseargPrecedence : if we convert a GreaterThan operation to a lesser than operation, the precedence of the args turns around
 * for example ?s: [10, 50] < ?r: [20, 60] -> returns ?s:[10, 20[ - ?r:[20, 60]
 * but         ?r: [20, 60] > ?s: [10, 50] -> returns ?s:[10, 50] - r?:[50, 60]
 * Because of this, we cannot just change signs and argument orders, but we have to assign a reversed precedence operation
 */
function lesserThan (left: VariableBinding, right: VariableBinding, reverseargPrecedence = false) : VariableBinding[] | null {
  const lvar = left.variable
  const rvar = right.variable
  const lvr = left.valueRange
  const rvr = right.valueRange
  const operator = reverseargPrecedence ? '>' : '<'

  checkInequalityArguments(operator, left, right)
  if (lvar && !rvar) { // ?s - any, null - any
    if (!lvr) { // ?s - null, null - |c, d|
      if (rvr instanceof StringValueRange) {
        return ([new VariableBinding(lvar, new StringValueRange(null, rvr.start, DataType.STRING, false, !rvr.startInclusive))])
      } else if (rvr instanceof NumberValueRange) {
        return ([new VariableBinding(lvar, new NumberValueRange(null, rvr.start, rvr.dataType, false, !rvr.startInclusive))])
      }
    } else if (lvr && rvr) { // null - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(lvar, valRanges[0])
      ]
    }
  } else if (rvar && !lvar) { // ?s - any, ?r - any
    if (!rvr) { // null - |a, b|, ?r - null
      if (lvr instanceof StringValueRange) {
        return ([new VariableBinding(rvar, new StringValueRange(lvr.end, null, DataType.STRING, !lvr.endInclusive, false))])
      } else if (lvr instanceof NumberValueRange) {
        return ([new VariableBinding(rvar, new NumberValueRange(lvr.end, null, lvr.dataType, !lvr.endInclusive, false))])
      }
    } else if (lvr && rvr) { // null - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(rvar, valRanges[1])
      ]
    }
  } else { // ?s - any, ?r - any
    if (!lvr && !rvr) { // ?s - null, ?r - null     =>      We map the variables on each other (currently no support, but for the future)
      return [
        new VariableBinding(lvar, new UnknownValueRange(null, rvar, undefined, false, false)),
        new VariableBinding(rvar, new UnknownValueRange(lvar, null, undefined, false, false))
      ]
    } else if (lvr && !rvr) { // ?s - |a, b|, ?r - null
      if (lvr instanceof StringValueRange) {
        return [
          new VariableBinding(lvar, new StringValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive)),
          new VariableBinding(rvar, new StringValueRange(lvr.end, null, DataType.STRING, !lvr.endInclusive, false))
        ]
      } else if (lvr instanceof NumberValueRange) {
        return [
          new VariableBinding(lvar, new NumberValueRange(lvr.start, lvr.end, lvr.dataType, lvr.startInclusive, lvr.endInclusive)),
          new VariableBinding(rvar, new NumberValueRange(lvr.end, null, lvr.dataType, !lvr.endInclusive, false))
        ]
      }
    } else if (!lvr && rvr) { // ?s - null, ?r - |c, d|
      if (rvr instanceof StringValueRange) {
        return [
          new VariableBinding(lvar, new StringValueRange(null, rvr.start, DataType.STRING, false, !rvr.startInclusive)),
          new VariableBinding(rvar, new StringValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive))
        ]
      } else if (rvr instanceof NumberValueRange) {
        return [
          new VariableBinding(lvar, new NumberValueRange(null, rvr.start, rvr.dataType, false, !rvr.startInclusive)),
          new VariableBinding(rvar, new NumberValueRange(rvr.start, rvr.end, rvr.dataType, rvr.startInclusive, rvr.endInclusive))
        ]
      }
    } else if (lvr && rvr) { // ?s - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(lvar, valRanges[0]),
        new VariableBinding(rvar, valRanges[1])
      ]
    }
  }
  return null
}

function combineValRangesLT (lvr: ValueRange, rvr: ValueRange, reversedPrecedence = false, equals = false) : ValueRange[] | null{
  if (lvr instanceof StringValueRange && rvr instanceof StringValueRange) {
    if (!lvr.end && !rvr.start) {
      return [
        new StringValueRange(lvr.start, rvr.end, DataType.STRING, lvr.startInclusive, !!equals),
        new StringValueRange(rvr.start, rvr.end, DataType.STRING, !!equals, rvr.endInclusive)
      ]
    } else if (!lvr.end) {
      return [
        new StringValueRange(lvr.start, rvr.start, DataType.STRING, lvr.startInclusive, equals ? rvr.startInclusive : !rvr.startInclusive),
        new StringValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive)
      ]
    } else if (!rvr.start) {
      return [
        new StringValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
        new StringValueRange(lvr.end, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
      ]
    } else {
      if (lvr.end < rvr.start) {
        return [
          new StringValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
          new StringValueRange(rvr.start, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
        ]
      } else {
        if (!reversedPrecedence) {
          return [
            new StringValueRange(lvr.start, rvr.start, DataType.STRING, lvr.startInclusive, equals ? rvr.startInclusive : !rvr.startInclusive),
            new StringValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive)
          ]
        } else {
          return [
            new StringValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
            new StringValueRange(lvr.end, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
          ]
        }
      }
    }
  } else if (lvr instanceof NumberValueRange && rvr instanceof NumberValueRange) {
    if (!lvr.end && !rvr.start) {
      return [
        new NumberValueRange(lvr.start, rvr.end, DataType.STRING, lvr.startInclusive, !!equals),
        new NumberValueRange(rvr.start, rvr.end, DataType.STRING, !!equals, rvr.endInclusive)
      ]
    } else if (!lvr.end) {
      return [
        new NumberValueRange(lvr.start, rvr.start, DataType.STRING, lvr.startInclusive, equals ? rvr.startInclusive : !rvr.startInclusive),
        new NumberValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive)
      ]
    } else if (!rvr.start) {
      return [
        new NumberValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
        new NumberValueRange(lvr.end, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
      ]
    } else {
      if (lvr.end < rvr.start) {
        return [
          new NumberValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
          new NumberValueRange(rvr.start, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
        ]
      } else {
        if (!reversedPrecedence) {
          return [
            new NumberValueRange(lvr.start, rvr.start, DataType.STRING, lvr.startInclusive, equals ? rvr.startInclusive : !rvr.startInclusive),
            new NumberValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive)
          ]
        } else {
          return [
            new NumberValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive),
            new NumberValueRange(lvr.end, rvr.end, DataType.STRING, equals ? lvr.endInclusive : !lvr.endInclusive, rvr.endInclusive)
          ]
        }
      }
    }
  return null
}

/**
 * Lesser Than Operator
 * @param left : Left VariableBinding
 * @param right : Right VariableBinding
 * @param reverseargPrecedence : if we convert a GreaterThan operation to a lesser than operation, the precedence of the args turns around
 * for example ?s: [10, 50] < ?r: [20, 60] -> returns ?s:[10, 20[ - ?r:[20, 60]
 * but         ?r: [20, 60] > ?s: [10, 50] -> returns ?s:[10, 50] - r?:[50, 60]
 * Because of this, we cannot just change signs and argument orders, but we have to assign a reversed precedence operation
 */
function lesserThanEqual (left: VariableBinding, right: VariableBinding, reverseargPrecedence = false) : VariableBinding[] | null {
  const lvar = left.variable
  const rvar = right.variable
  const lvr = left.valueRange
  const rvr = right.valueRange
  const operator = reverseargPrecedence ? '>=' : '<='

  checkInequalityArguments(operator, left, right)
  if (lvar && !rvar) { // ?s - any, null - any
    if (!lvr) { // ?s - null, null - |c, d|
      if (rvr instanceof StringValueRange) {
        return ([new VariableBinding(lvar, new StringValueRange(null, rvr.start, DataType.STRING, false, true))])
      } else if (rvr instanceof NumberValueRange) {
        return ([new VariableBinding(lvar, new NumberValueRange(null, rvr.start, rvr.dataType, false, true))])
      }
    } else if (lvr && rvr) { // null - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(lvar, valRanges[0])
      ]
    }
  } else if (rvar && !lvar) { // ?s - any, ?r - any
    if (!rvr) { // null - |a, b|, ?r - null
      if (lvr instanceof StringValueRange) {
        return ([new VariableBinding(rvar, new StringValueRange(lvr.end, null, DataType.STRING, true, false))])
      } else if (lvr instanceof NumberValueRange) {
        return ([new VariableBinding(rvar, new NumberValueRange(lvr.end, null, lvr.dataType, true, false))])
      }
    } else if (lvr && rvr) { // null - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(rvar, valRanges[1])
      ]
    }
  } else { // ?s - any, ?r - any
    if (!lvr && !rvr) { // ?s - null, ?r - null     =>      We map the variables on each other (currently no support, but for the future)
      return [
        new VariableBinding(lvar, new UnknownValueRange(null, rvar, undefined, false, true)),
        new VariableBinding(rvar, new UnknownValueRange(lvar, null, undefined, true, false))
      ]
    } else if (lvr && !rvr) { // ?s - |a, b|, ?r - null
      if (lvr instanceof StringValueRange) {
        return [
          new VariableBinding(lvar, new StringValueRange(lvr.start, lvr.end, DataType.STRING, lvr.startInclusive, lvr.endInclusive)),
          new VariableBinding(rvar, new StringValueRange(lvr.end, null, DataType.STRING, true, false))
        ]
      } else if (lvr instanceof NumberValueRange) {
        return [
          new VariableBinding(lvar, new NumberValueRange(lvr.start, lvr.end, lvr.dataType, lvr.startInclusive, lvr.endInclusive)),
          new VariableBinding(rvar, new NumberValueRange(lvr.end, null, lvr.dataType, true, false))
        ]
      }
    } else if (!lvr && rvr) { // ?s - null, ?r - |c, d|
      if (rvr instanceof StringValueRange) {
        return [
          new VariableBinding(lvar, new StringValueRange(null, rvr.start, DataType.STRING, false, true)),
          new VariableBinding(rvar, new StringValueRange(rvr.start, rvr.end, DataType.STRING, rvr.startInclusive, rvr.endInclusive))
        ]
      } else if (rvr instanceof NumberValueRange) {
        return [
          new VariableBinding(lvar, new NumberValueRange(null, rvr.start, rvr.dataType, false, true)),
          new VariableBinding(rvar, new NumberValueRange(rvr.start, rvr.end, rvr.dataType, rvr.startInclusive, rvr.endInclusive))
        ]
      }
    } else if (lvr && rvr) { // ?s - |a, b|, ?r - |c, d|
      const valRanges = combineValRangesLT(lvr, rvr, reverseargPrecedence)
      if (!valRanges) return null
      return [
        new VariableBinding(lvar, valRanges[0]),
        new VariableBinding(rvar, valRanges[1])
      ]
    }
  }
  return null
}

function greaterThan (left: VariableBinding, right: VariableBinding) : VariableBinding[] | null {
  return lesserThan(right, left, true)
}

function greaterThanEqual (left: VariableBinding, right: VariableBinding) : VariableBinding[] | null {
  return lesserThanEqual(right, left, true)
}

// function lesserThanEqual (left: VariableBinding, right: VariableBinding) : VariableBinding[] | null {
//   const operator = '<='
//   checkInequalityArguments(operator, left, right)
//   if (left.variable && !right.variable) {
//     if (!left.valueRange) {
//       if (right.valueRange instanceof StringValueRange) {
//         return ([new VariableBinding(left.variable, new StringValueRange(null, right.valueRange.start, DataType.STRING, false, true))])
//       } else if (right.valueRange instanceof NumberValueRange) {
//         return ([new VariableBinding(left.variable, new NumberValueRange(null, right.valueRange.start, right.valueRange.dataType, false, true))])
//       }
//     } else {
//       if (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange) {
//         return ([new VariableBinding(left.variable, new StringValueRange(left.valueRange.start, right.valueRange.start, DataType.STRING, left.valueRange.startInclusive, true))])
//       } else if (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange) {
//         return ([new VariableBinding(left.variable, new NumberValueRange(left.valueRange.start, right.valueRange.start, getResultNumberType(left.valueRange.dataType, right.valueRange.dataType), left.valueRange.startInclusive, true))])
//       }
//     }
//   } else if (right.variable && !left.variable) {
//     if (!right.valueRange) {
//       if (left.valueRange instanceof StringValueRange) {
//         return ([new VariableBinding(right.variable, new StringValueRange(left.valueRange.end, null, DataType.STRING, true, false))])
//       } else if (left.valueRange instanceof NumberValueRange) {
//         return ([new VariableBinding(right.variable, new NumberValueRange(left.valueRange.end, null, left.valueRange.dataType, true, false))])
//       }
//     } else {
//       if (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange) {
//         return ([new VariableBinding(right.variable, new StringValueRange(left.valueRange.end, right.valueRange.end, DataType.STRING, true, right.valueRange.endInclusive))])
//       } else if (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange) {
//         return ([new VariableBinding(right.variable, new NumberValueRange(left.valueRange.end, right.valueRange.end, getResultNumberType(left.valueRange.dataType, right.valueRange.dataType), true, right.valueRange.endInclusive))])
//       }
//     }
//   } else { // left.variable && right.variable
//     if (!left.valueRange && !right.valueRange) { // We map the variables on each other (currently no support, but for the future)
//       return [
//         new VariableBinding(left.variable, new UnknownValueRange(null, right.variable, undefined, false, true)),
//         new VariableBinding(right.variable, new UnknownValueRange(left.variable, null, undefined, true, false))
//       ]
//     } else if (left.valueRange && !right.valueRange) {
//       if (left.valueRange instanceof StringValueRange) {
//         return [
//           new VariableBinding(left.variable, new StringValueRange(left.valueRange.start, left.valueRange.end, DataType.STRING, left.valueRange.startInclusive, left.valueRange.endInclusive)),
//           new VariableBinding(right.variable, new StringValueRange(left.valueRange.end, null, DataType.STRING, true, false))
//         ]
//       } else if (left.valueRange instanceof NumberValueRange) {
//         return [
//           new VariableBinding(left.variable, new NumberValueRange(left.valueRange.start, left.valueRange.end, left.valueRange.dataType, left.valueRange.startInclusive, left.valueRange.endInclusive)),
//           new VariableBinding(right.variable, new NumberValueRange(left.valueRange.end, null, left.valueRange.dataType, true, false))
//         ]
//       }
//     } else if (!left.valueRange && right.valueRange) {
//       if (right.valueRange instanceof StringValueRange) {
//         return [
//           new VariableBinding(left.variable, new StringValueRange(null, right.valueRange.start, DataType.STRING, false, true)),
//           new VariableBinding(right.variable, new StringValueRange(right.valueRange.start, right.valueRange.end, DataType.STRING, right.valueRange.startInclusive, right.valueRange.endInclusive))
//         ]
//       } else if (right.valueRange instanceof NumberValueRange) {
//         return [
//           new VariableBinding(left.variable, new NumberValueRange(null, right.valueRange.start, right.valueRange.dataType, false, true)),
//           new VariableBinding(right.variable, new NumberValueRange(right.valueRange.start, right.valueRange.end, right.valueRange.dataType, right.valueRange.startInclusive, right.valueRange.endInclusive))
//         ]
//       }
//     } else { // left.valueRange && right.valueRange
//       if (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange) {
//         return [
//           new VariableBinding(left.variable, new StringValueRange(left.valueRange.start, right.valueRange.start, DataType.STRING, left.valueRange.startInclusive, true)),
//           new VariableBinding(right.variable, new StringValueRange(left.valueRange.end, right.valueRange.end, DataType.STRING, true, right.valueRange.endInclusive))
//         ]
//       } else if (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange) {
//         return [
//           new VariableBinding(left.variable, new NumberValueRange(left.valueRange.start, right.valueRange.start, getResultNumberType(left.valueRange.dataType, right.valueRange.dataType), left.valueRange.startInclusive, true)),
//           new VariableBinding(right.variable, new NumberValueRange(left.valueRange.end, right.valueRange.end, getResultNumberType(left.valueRange.dataType, right.valueRange.dataType), true, right.valueRange.endInclusive))
//         ]
//       }
//     }
//   }
//   return null
// }

// function lesserThanEqual (left: VariableBinding, right: VariableBinding) {
//   if (!left || !right) throw getIncorrectNumberOfOperandsError('<=')
//   if ((!left.valueRange && right.valueRange instanceof StringValueRange) || (!right.valueRange && left.valueRange instanceof StringValueRange) || (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange)) {
//     if (right.valueRange.end && right.valueRange.end < left.valueRange.end) { // End inclusive as it is lesser than or eaqual -> priority for left value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new StringValueRange(left.valueRange.start, right.valueRange.end, right.valueRange.dataType, left.valueRange.startInclusive, true))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else if ((!left.valueRange && right.valueRange instanceof NumberValueRange) || (!right.valueRange && left.valueRange instanceof NumberValueRange) || (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange)) {
//     if (right.valueRange.end && right.valueRange.end < left.valueRange.end) { // End inclusive as it is lesser than or eaqual -> priority for left value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new NumberValueRange(left.valueRange.start, right.valueRange.end, right.valueRange.dataType, left.valueRange.startInclusive, true))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else throw new Error('Could not process <= operand with arguments: ' + left.toString() + ' , ' + right.toString())
// }

// function greaterThan (left: VariableBinding, right: VariableBinding) {
//   if (!left || !right) throw getIncorrectNumberOfOperandsError('>')
//   if ((!left.valueRange && right.valueRange instanceof StringValueRange) || (!right.valueRange && left.valueRange instanceof StringValueRange) || (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange)) {
//     if (right.valueRange.start && right.valueRange.start >= left.valueRange.start) { // Start not inclusive as it is greater than -> priority for right value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new StringValueRange(right.valueRange.start, left.valueRange.end, right.valueRange.dataType, false, left.valueRange.endInclusive))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else if ((!left.valueRange && right.valueRange instanceof NumberValueRange) || (!right.valueRange && left.valueRange instanceof NumberValueRange) || (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange)) {
//     if (right.valueRange.start && right.valueRange.start >= left.valueRange.start) { // Start not inclusive as it is greater than -> priority for right value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new NumberValueRange(right.valueRange.start, left.valueRange.end, right.valueRange.dataType, false, left.valueRange.endInclusive))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else throw new Error('Could not process > operand with arguments: ' + JSON.stringify(left, null, 2) + ' , ' + JSON.stringify(right, null, 2))
// }
// function greaterThanEqual (left: VariableBinding, right: VariableBinding) {
//   if (!left || !right) throw getIncorrectNumberOfOperandsError('>=')
//   if ((!left.valueRange && right.valueRange instanceof StringValueRange) || (!right.valueRange && left.valueRange instanceof StringValueRange) || (left.valueRange instanceof StringValueRange && right.valueRange instanceof StringValueRange)) {
//     if (right.valueRange.start && right.valueRange.start > left.valueRange.start) { // Start inclusive as it is greater than or eaqual -> priority for left value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new StringValueRange(right.valueRange.start, left.valueRange.end, right.valueRange.dataType, true, left.valueRange.endInclusive))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else if ((!left.valueRange && right.valueRange instanceof NumberValueRange) || (!right.valueRange && left.valueRange instanceof NumberValueRange) || (left.valueRange instanceof NumberValueRange && right.valueRange instanceof NumberValueRange)) {
//     if (right.valueRange.start && right.valueRange.start > left.valueRange.start) { // Start inclusive as it is greater than or eaqual -> priority for left value inclusivity on equal
//       return new VariableBinding(left.variable || right.variable, new NumberValueRange(right.valueRange.start, left.valueRange.end, right.valueRange.dataType, true, left.valueRange.endInclusive))
//     }
//     return new VariableBinding(left.variable || right.variable, left.valueRange)
//   } else throw new Error('Could not process > operand with arguments: ' + JSON.stringify(left, null, 2) + ' , ' + JSON.stringify(right, null, 2))
// }

// // Logical operators
// function logicalAnd (left: VariableBinding, right: VariableBinding) {
//   throw getOperandNotImplementedError('&&')
// }
// function logicalOr (left: VariableBinding, right: VariableBinding) {
//   throw getOperandNotImplementedError('||')
// }

// // String Functions
// function ucase () {

// }

// function lcase () {

// }

// function strstarts (left: VariableBinding) {

// }

// // Type castings
// export function string (binding: VariableBinding) {
//   if (binding instanceof VariableBinding) {
//     binding.valueRange = binding.valueRange.castDecimal()
//   } else {

//   }
// }

// export function decimal (binding: VariableBinding) {
//   if (binding instanceof VariableBinding) {
//     binding.valueRange = binding.valueRange.castDecimal()
//   } else {

//   }
// }

export function integer (binding: VariableBinding) {}

export function float (binding: VariableBinding) {}

export function double (binding: VariableBinding) {}

export function dateTime (binding: VariableBinding) {}

export function boolean (binding: VariableBinding) {}

/**
 * Bind a valueRange to a variable based on a given term. Both the start and end of the range are identical in this case, as we have a single value
 * @param variable The variable to bind the term to
 * @param term The literal or namednode to bind
 */
export function bindVariableToTerm (variable : Variable | undefined, term: Literal | NamedNode) : VariableBinding {
  if (term.termType === 'NamedNode') { // Handle IRIs as string variables for sake of simplicity
    return new VariableBinding(variable, new StringValueRange(term.value, term.value))
  }
  if (!term.datatype) { // In case of simple literals
    return new VariableBinding(variable, new UnknownValueRange(term.value, term.value))
  }
  switch (term.datatype.value) {
    case xsd + 'string':
      return new VariableBinding(variable, new StringValueRange(term.value, term.value, DataType.STRING, true, true))
    case xsd + 'decimal':
      return new VariableBinding(variable, new NumberValueRange(parseInt(term.value), parseInt(term.value), DataType.DECIMAL, true, true))
    case xsd + 'integer':
      return new VariableBinding(variable, new NumberValueRange(parseInt(term.value), parseInt(term.value), DataType.INTEGER, true, true))
    case xsd + 'int': // For the sake of simplicity we currently handle this as if it were integer
      return new VariableBinding(variable, new NumberValueRange(parseInt(term.value), parseInt(term.value), DataType.INTEGER, true, true))
    case xsd + 'float':
      return new VariableBinding(variable, new NumberValueRange(parseFloat(term.value), parseFloat(term.value), DataType.FLOAT, true, true))
    case xsd + 'double':
      return new VariableBinding(variable, new NumberValueRange(parseFloat(term.value), parseFloat(term.value), DataType.DOUBLE, true, true))
    case xsd + 'dateTime':
      return new VariableBinding(variable, new DateTimeValueRange(new Date(term.value), new Date(term.value), DataType.DATETIME, true, true))
    case xsd + 'boolean': // Booleans are currently not implemented for tree pruning purposes
      return new VariableBinding(variable, new UnknownValueRange(term.value, term.value, DataType.BOOLEAN))
    default:
      return new VariableBinding(variable, new UnknownValueRange(term.value, term.value))
  }
}

// UnknownValueRanges cannot be compared, as we do not know the type of these value ranges
function canCompareValueRanges (vr1: ValueRange, vr2: ValueRange) {
  if (vr1 instanceof NumberValueRange && vr2 instanceof NumberValueRange) return true
  if (vr1 instanceof StringValueRange && vr2 instanceof StringValueRange) return true
  if (vr1 instanceof LocationValueRange && vr2 instanceof LocationValueRange) return true
  if (vr1 instanceof DateTimeValueRange && vr2 instanceof DateTimeValueRange) return true
  return false
}

const operandMapping = {
  // '!': not,
  // UPLUS: unaryPlus,
  // UMINUS: unaryMinus,
  // '*': multiplication,
  // '/': division,
  // '+': addition,
  // '-': subtraction,
  // '=': equality,
  // '!=': inequality,
  '<': lesserThan,
  // '>': greaterThan,
  '<=': lesserThanEqual
  // '>=': greaterThanEqual

  // Logical operators
  // '&&': logicalAnd,
  // '||': logicalOr,

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  // 'strlen': STRLEN,                                          ->  strlen is not supported
  // 'substr': SUBSTR,                                        --->  currently not supported - might change in later revision to support substring searches better
  // ucase: ucase,
  // lcase: lcase,
  // strstarts: strstarts
  // 'strends': STRENDS,                                      --->  currently not supported - might change in later revision to support substring searches better
  // 'contains': CONTAINS,                                    --->  currently not supported - might change in later revision to support substring searches better
  // 'strbefore': STRBEFORE,                                  --->  currently not supported - might change in later revision to support substring searches better
  // 'strafter': STRAFTER,                                    --->  currently not supported - might change in later revision to support substring searches better
  // 'encode_for_uri': ENCODE_FOR_URI,                          ->  URI encoding is not supported
  // 'concat': CONCAT                                           ->  concat is not supported
  // 'langmatches': langmatches,                              --->  language matching is currently not supported - might change in later revision to support trees with different language tags
  // 'regex': REGEX,                                            ->  regexes are not supported
  // 'replace': REPLACE                                         ->  replace is not supported

  // Type Conversions

  //   // --------------------------------------------------------------------------
  //   // Functions on RDF Terms
  //   // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  //   // --------------------------------------------------------------------------
  //   'isiri': isIRI,
  //   'isblank': isBlank,
  //   'isliteral': isLiteral,
  //   'isnumeric': isNumeric,
  //   'str': toString,
  //   'lang': lang,
  //   'datatype': datatype,
  //   // 'iri': IRI (see special operators),
  //   // 'uri': IRI (see special operators),
  //   // 'BNODE': BNODE (see special operators),
  //   'strdt': STRDT,
  //   'strlang': STRLANG,
  //   'uuid': UUID,
  //   'struuid': STRUUID,

  //   // --------------------------------------------------------------------------
  //   // Functions on strings
  //   // https://www.w3.org/TR/sparql11-query/#func-forms
  //   // --------------------------------------------------------------------------
  //   'strlen': STRLEN,
  //   'substr': SUBSTR,
  //   'ucase': UCASE,
  //   'lcase': LCASE,
  //   'strstarts': STRSTARTS,
  //   'strends': STRENDS,
  //   'contains': CONTAINS,
  //   'strbefore': STRBEFORE,
  //   'strafter': STRAFTER,
  //   'encode_for_uri': ENCODE_FOR_URI,
  //   // 'concat': CONCAT (see special operators)
  //   'langmatches': langmatches,
  //   'regex': REGEX,
  //   'replace': REPLACE,

  //   // --------------------------------------------------------------------------
  //   // Functions on numerics
  //   // https://www.w3.org/TR/sparql11-query/#func-numerics
  //   // --------------------------------------------------------------------------
  //   'abs': abs,
  //   'round': round,
  //   'ceil': ceil,
  //   'floor': floor,
  //   'rand': rand,

  //   // --------------------------------------------------------------------------
  //   // Functions on Dates and Times
  //   // https://www.w3.org/TR/sparql11-query/#func-date-time
  //   // --------------------------------------------------------------------------
  //   // 'now': now (see special operators),
  //   'year': year,
  //   'month': month,
  //   'day': day,
  //   'hours': hours,
  //   'minutes': minutes,
  //   'seconds': seconds,
  //   'timezone': timezone,
  //   'tz': tz,

//   // --------------------------------------------------------------------------
//   // Hash functions    -     Not implemented as these do currently not enable pruning of relations in the TREE SPECIFICATION
//   // https://www.w3.org/TR/sparql11-query/#func-hash
//   // --------------------------------------------------------------------------
//   'md5': MD5,
//   'sha1': SHA1,
//   'sha256': SHA256,
//   'sha384': SHA384,
//   'sha512': SHA512,
}
