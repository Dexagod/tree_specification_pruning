import ValueRange from './ValueRange'
import { DataType } from '../Util/DataTypes'
import StringValueRange from './StringValueRange'
export default class DateTimeValueRange extends ValueRange {
  start: Date;
  end: Date;
  startInclusive: boolean;
  endInclusive: boolean;
  constructor (start: Date, end: Date, dataType?: DataType, startInclusive?: boolean, endInclusive?: boolean) {
    super('datetime', dataType)
    this.start = start
    this.end = end
    this.startInclusive = startInclusive || true
    this.endInclusive = endInclusive || true
  }

  castString () : ValueRange {
    throw this.conversionError(this.dataType, DataType.STRING)
    // return new StringValueRange()
  };

  castInteger () : ValueRange {
    throw this.conversionError(this.dataType, DataType.INTEGER)
  };

  castDecimal () : ValueRange {
    throw this.conversionError(this.dataType, DataType.DECIMAL)
  };

  castFloat () : ValueRange {
    throw this.conversionError(this.dataType, DataType.FLOAT)
  };

  castDouble () : ValueRange {
    throw this.conversionError(this.dataType, DataType.DOUBLE)
  };

  castDateTime () : ValueRange {
    throw this.conversionError(this.dataType, DataType.STRING)
  };

  castBoolean () : ValueRange {
    throw this.conversionError(this.dataType, DataType.STRING)
  };
}
