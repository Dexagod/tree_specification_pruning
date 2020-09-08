import * as N3 from 'n3'

export default abstract class Path {
  value : string | null | Path | Path[];
  subject: N3.Term | undefined;
  object: N3.Term | undefined;
  constructor (value : string | Path | Path[] | null, subject? : N3.Term, object?: N3.Term) {
    this.value = value
    this.subject = subject
    this.object = object
  }

  abstract getPathString() : string;
}
