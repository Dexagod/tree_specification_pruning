/* eslint-disable no-multi-str */
import { expect } from 'chai'
import 'mocha'
import { Literal } from 'rdf-js'
import VariableBinding from '../../src/Bindings/VariableBinding'
import { evaluateOperation } from '../../src/Operations'
import * as N3 from 'n3'
import UnknownValueRange from '../../src/ValueRanges/UnknownValueRange'
import StringValueRange from '../../src/ValueRanges/StringValueRange'
import NumberValueRange from '../../src/ValueRanges/NumberValueRange'
import { DataType } from '../../src/Util/DataTypes'

describe('Testing operands',
  () => {
    function shouldEvaluateTo (operator: string, left: VariableBinding, right: VariableBinding, result: VariableBinding[] | null, message: string) {
      it(message + ' for a ' + operator + ' operator', function () {
        if (result === null) {
          return expect(() => evaluateOperation(operator, [left, right])).to.throw()
        }
        expect(evaluateOperation(operator, [left, right])).to.deep.equal(result)
      })
    }

    function getVar (varName: string = 's') { return N3.DataFactory.variable(varName) }
    function getStringValRange (first:string = 'a', last:string = 'z') { return new StringValueRange(first, last, DataType.STRING) }
    function getNumberValRange (first:number = 1, last:number = 100) { return new NumberValueRange(first, last, DataType.INTEGER) }
    function getEmptyBinding () { return new VariableBinding() }
    function getVariableBinding (varName: string = 's') { return new VariableBinding(getVar(varName)) }
    function getStringValueRangeBinding (first:string = 'a', last:string = 'z') { return new VariableBinding(undefined, getStringValRange(first, last)) }
    function getNumberValueRangeBinding (first:number = 1, last:number = 100) { return new VariableBinding(undefined, getNumberValRange(first, last)) }
    function getStringFullBinding (varName: string = 's', first:string = 'a', last:string = 'z') { return new VariableBinding(getVar(varName), getStringValRange(first, last)) }
    function getNumberFullBinding (varName: string = 's', first:number = 1, last:number = 100) { return new VariableBinding(getVar(varName), getNumberValRange(first, last)) }

    function test () {
      shouldEvaluateTo('<', getEmptyBinding(), getEmptyBinding(), null, 'No variables should evaluate to null')
      shouldEvaluateTo('<', getStringValueRangeBinding(), getStringValueRangeBinding(), null, 'No variables should evaluate to null')
      shouldEvaluateTo('<', getEmptyBinding(), getStringFullBinding(), null, 'An empty binding argument should resolve to null')
      shouldEvaluateTo('<', getNumberFullBinding(), getEmptyBinding(), null, 'An empty binding argument should resolve to null')

      // ?s - null      <     null - ]c,d[       ->   ?s - ]null, a[
      // ?s - null      <     null - ]11, 20[    ->   ?s - ]null, 11[
      shouldEvaluateTo('<', getVariableBinding('s'), getStringValueRangeBinding('c', 'd'),
        [new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange(null, 'c', DataType.STRING, false, false))],
        'A variableBinding and a string value range should resolve to a binding for the variable with an upper bound not inclusive')
      shouldEvaluateTo('<', getVariableBinding('s'), getNumberValueRangeBinding(11, 20),
        [new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(null, 11, DataType.INTEGER, false, false))],
        'A variableBinding and a number value range should resolve to a binding for the variable with an upper bound not inclusive')

      // null - ]a,b[    <   ?t - null         ->   ?t - ]b, null[
      // null - ]1, 10[  <   ?t - null         ->   ?t - ]10, null[
      shouldEvaluateTo('<', getStringValueRangeBinding('a', 'b'), getVariableBinding('t'),
        [new VariableBinding(N3.DataFactory.variable('t'), new StringValueRange('b', null, DataType.STRING, false, false))],
        'A string value range and a variableBinding should resolve to a binding for the variable with a lower bound not inclusive')
      shouldEvaluateTo('<', getNumberValueRangeBinding(1, 10), getVariableBinding('t'),
        [new VariableBinding(N3.DataFactory.variable('t'), new NumberValueRange(10, null, DataType.INTEGER, false, false))],
        'A number value range and a variableBinding should resolve to a binding for the variable with a lower bound not inclusive')

      // ?s - ]a, b[      <     null - ]c, d[     ->   ?s - ]a, b[
      // ?s - ]1, 10[     <     null - ]11, 20[   ->   ?s - ]1, 10[
      shouldEvaluateTo('<', getStringFullBinding('s', 'a', 'b'), getStringValueRangeBinding('c', 'd'),
        [new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange('a', 'b', DataType.STRING, false, false))],
        's - ]a, b[      <     null - ]c, d[     ->   ?s - ]a, b[')
      shouldEvaluateTo('<', getNumberFullBinding('s', 1, 10), getNumberValueRangeBinding(11, 20),
        [new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(1, 10, DataType.INTEGER, false, false))],
        '?s - ]1, 10[     <     null - ]11, 20[   ->   ?s - ]1, 10[')
      // ?s - ]a, c[      <     null - ]b, d[     ->   ?s - ]a, b[
      // ?s - ]1, 11[     <     null - ]10, 20[   ->   ?s - ]1, 10[
      shouldEvaluateTo('<', getStringFullBinding('s', 'a', 'c'), getStringValueRangeBinding('b', 'd'),
        [new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange('a', 'b', DataType.STRING, false, false))],
        '?s - ]a, c[      <     null - ]b, d[     ->   ?s - ]a, b[')
      shouldEvaluateTo('<', getNumberFullBinding('s', 1, 11), getNumberValueRangeBinding(10, 20),
        [new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(1, 10, DataType.INTEGER, false, false))],
        '?s - ]1, 11[     <     null - ]10, 20[   ->   ?s - ]1, 10[')

      // // null - ]a,b[     <   ?t - ]c,d[        ->   ?s - ]z, null[
      // // null - ]1, 10[   <   ?t - ]11,20[      ->   ?s - ]100, null[
      // shouldEvaluateTo('<', getStringValueRangeBinding('a', 'z'), getVariableBinding('s'),
      //   [new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange('z', null, DataType.STRING, false, false))],
      //   'A string value range and a variableBinding should resolve to a binding for the variable with a lower bound not inclusive')
      // shouldEvaluateTo('<', getNumberValueRangeBinding(1, 100), getVariableBinding('s'),
      //   [new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, null, DataType.INTEGER, false, false))],
      //   'A number value range and a variableBinding should resolve to a binding for the variable with a lower bound not inclusive')

      // shouldEvaluateTo('>', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('<=', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('>=', getEmptyBinding(), N3.DataFactory.literal(100))
      // shouldEvaluateTo('>', getEmptyBinding(), N3.DataFactory.literal(100))
    }

    test()
  })
