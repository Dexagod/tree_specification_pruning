/* eslint-disable no-multi-str */
import { expect } from 'chai'
import 'mocha'
import { Literal, Variable, NamedNode } from 'rdf-js'
import { evaluateOperation, bindVariableToTerm } from '../../src/Operations'
import * as N3 from 'n3'
import ValueRange from '../../src/ValueRanges/ValueRange'
import UnknownValueRange from '../../src/ValueRanges/UnknownValueRange'
import VariableBinding from '../../src/Bindings/VariableBinding'
import StringValueRange from '../../src/ValueRanges/StringValueRange'
import { NameSpaces } from '../../src/Util/NameSpaces'
import { DataType } from '../../src/Util/DataTypes'
import NumberValueRange from '../../src/ValueRanges/NumberValueRange'
import DateTimeValueRange from '../../src/ValueRanges/DateTimeValueRange';

const xsd = NameSpaces.XSD

describe('Testing path matching',
  () => {
    function shouldEvaluateTo (variable: Variable, term: Literal | NamedNode, result: VariableBinding, message: string) {
      it(message, function () {
        const valueRange = bindVariableToTerm(variable, term)
        expect(valueRange).to.deep.equal(result)
      })
    }

    function test () {
      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('test'),
        new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange('test', 'test', DataType.STRING)),
        'Should cast a variable to a string valuerange when assigned a string literal')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100', N3.DataFactory.namedNode(xsd + 'string')),
        new VariableBinding(N3.DataFactory.variable('s'), new StringValueRange('100', '100', DataType.STRING)),
        'Should cast a variable to a number valuerange when assigned a string literal for a string datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal(100),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, 100, DataType.INTEGER)),
        'Should cast a variable to a number valuerange when assigned a number literal')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100', N3.DataFactory.namedNode(xsd + 'int')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, 100, DataType.INTEGER)),
        'Should cast a variable to a number valuerange when assigned a number literal for an int datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100', N3.DataFactory.namedNode(xsd + 'integer')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, 100, DataType.INTEGER)),
        'Should cast a variable to a number valuerange when assigned a number literal for an integer datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100', N3.DataFactory.namedNode(xsd + 'decimal')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, 100, DataType.DECIMAL)),
        'Should cast a variable to a number valuerange when assigned a number literal for a decimal datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100', N3.DataFactory.namedNode(xsd + 'float')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100, 100, DataType.FLOAT)),
        'Should cast a variable to a number valuerange when assigned a number literal for a float datatype without period')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100.01', N3.DataFactory.namedNode(xsd + 'float')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100.01, 100.01, DataType.FLOAT)),
        'Should cast a variable to a number valuerange when assigned a number literal for a float datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('100.01', N3.DataFactory.namedNode(xsd + 'double')),
        new VariableBinding(N3.DataFactory.variable('s'), new NumberValueRange(100.01, 100.01, DataType.DOUBLE)),
        'Should cast a variable to a number valuerange when assigned a number literal for a double datatype')

      shouldEvaluateTo(
        N3.DataFactory.variable('s'),
        N3.DataFactory.literal('2002-10-10T12:00:00', N3.DataFactory.namedNode(xsd + 'dateTime')),
        new VariableBinding(N3.DataFactory.variable('s'), new DateTimeValueRange(new Date('2002-10-10T12:00:00'), new Date('2002-10-10T12:00:00'), DataType.DATETIME)),
        'Should cast a variable to a number valuerange when assigned a number literal for a dateTime datatype')
    }

    test()
  })
