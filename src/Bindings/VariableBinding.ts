import { Variable, NamedNode } from 'rdf-js'
import ValueRange from '../ValueRanges/ValueRange'

export default class VariableBinding {
  variable?: Variable
  valueRange? : ValueRange
  constructor (variable? : Variable, valueRange?: ValueRange) {
    this.variable = variable
    this.valueRange = valueRange
  }

  updateValueRange (valueRange : ValueRange) {
    this.valueRange = valueRange
  }
}
