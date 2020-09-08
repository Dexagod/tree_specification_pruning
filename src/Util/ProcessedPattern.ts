import { Term } from 'sparqljs'
import * as N3 from 'n3'
import VariableBinding from '../Bindings/VariableBinding'
import { FoundPath } from './Util'
export default interface ProcessedPattern {
  type: 'filter' | 'bgp'
  matches?: N3.Term[]
  bindings?: VariableBinding[]
  paths?: FoundPath[]
}
