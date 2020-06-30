import PriorityBoolean from '../Util/PriorityBooolean'
export default abstract class Path {
  value : string | null | Path | Path[];

  constructor (value : string | Path | Path[] | null) {
    this.value = value
  }

  abstract getPathString() : string;

  abstract matches(path : Path) : PriorityBoolean;
}
