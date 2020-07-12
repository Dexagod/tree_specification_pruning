import ValueRange from './ValueRange'
import { DataType } from '../Util/DataTypes'
export default class UnknownValueRange extends ValueRange {
  start: any;
  end: any;
  startInclusive: boolean;
  endInclusive: boolean;
  constructor (start: any, end: any, dataType?: DataType, startInclusive?: boolean, endInclusive?: boolean) {
    super('unknown', dataType)
    this.start = start
    this.end = end
    this.startInclusive = startInclusive || true
    this.endInclusive = endInclusive || true
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
