import { DataType } from '../Util/DataTypes'
export default abstract class ValueRange {
  dataType: any
  type: 'string' | 'number' | 'location' | 'datetime' | 'unknown'
  constructor (type: 'string' | 'number' | 'location' | 'datetime' | 'unknown', dataType? : DataType) {
    this.dataType = dataType
    this.type = type
  }

  minus (otherValueRange: ValueRange) {}
  plus (otherValueRange: ValueRange) {}
  lessThan (otherValueRange: ValueRange) {}
  lessThanOrEqual (otherValueRange: ValueRange) {}
  equals (otherValueRange: ValueRange) {}
  greaterThanOrEqual (otherValueRange: ValueRange) {}
  greaterThan (otherValueRange: ValueRange) {}

  abstract castString () : ValueRange;
  abstract castInteger () : ValueRange;
  abstract castDecimal () : ValueRange;
  abstract castFloat () : ValueRange;
  abstract castDouble () : ValueRange;
  abstract castDateTime () : ValueRange;
  abstract castBoolean () : ValueRange;

  conversionError (sourceDataType: DataType, targetDataType: DataType) {
    return new Error('Illigal conversion from ' + sourceDataType + ' to ' + targetDataType + '.')
  }
}
