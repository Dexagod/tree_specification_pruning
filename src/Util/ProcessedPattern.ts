import { Term } from 'sparqljs'
import * as N3 from 'n3'
import VariableBinding from '../Bindings/VariableBinding'
export default interface ProcessedPattern {
  type: 'filter' | 'bgp',
  matches?: N3.Term[]
  bindings?: VariableBinding[]
}
