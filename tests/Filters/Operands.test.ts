/* eslint-disable no-multi-str */
import { expect } from 'chai'
import 'mocha'
import { Literal } from 'rdf-js'
import VariableBinding from '../../src/Bindings/VariableBinding'
import { evaluateOperation } from '../../src/Operations'
import * as N3 from 'n3'
import UnknownValueRange from '../../src/ValueRanges/UnknownValueRange'

describe('Testing operands',
  () => {
    function shouldEvaluateTo (operator: string, left: VariableBinding, right?: VariableBinding) {
      const args : VariableBinding[] = right ? [left, right] : [left]
      evaluateOperation(operator, args)
    }

    function getVar () { return N3.DataFactory.variable('s') }
    function getValRange () { return new UnknownValueRange(null, null) }
    function getEmptyBinding () { return new VariableBinding(getVar(), getValRange()) }

    function test () {
      // shouldEvaluateTo('<', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('>', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('<=', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('>=', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('>', getEmptyBinding(), N3.DataFactory.literal(100))
    }

    test()
  })
