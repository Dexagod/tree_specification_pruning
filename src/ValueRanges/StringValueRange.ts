import ValueRange from './ValueRange'
import { DataType } from '../Util/DataTypes'
export default class StringValueRange extends ValueRange {
  start: null | string;
  end: null | string;
  startInclusive: boolean;
  endInclusive: boolean;
  constructor (start: null | string, end: null | string, dataType?: DataType, startInclusive?: boolean, endInclusive?: boolean) {
    super('string', dataType)
    this.start = start
    this.end = end
    this.startInclusive = !!startInclusive
    this.endInclusive = !!endInclusive
  }

  castString () : ValueRange {
    throw this.conversionError(this.dataType, DataType.STRING)
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
