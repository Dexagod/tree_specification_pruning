import ValueRange from './ValueRange'
import { DataType } from '../Util/DataTypes'
export default class LocationValueRange extends ValueRange {
  area: any
  constructor (area: any, dataType?: DataType) {
    super('location', dataType)
    this.dataType = this.dataType || DataType.STRING
    this.area = area
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
