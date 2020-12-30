export class FixLengthArray<I = any> extends Array {
  constructor(private _length: number) {
    super();
  }

  push(...items: I[]) {
    super.push.apply(this, items);
    while (this.length > this._length) {
      this.shift();
    }
    return this.length - 1;
  }
  unshift(...items: I[]) {
    super.unshift.apply(this, items);
    while (this.length > this._length) {
      this.pop();
    }
    return this.length - 1;
  }

  setMaxLength(value: number) {
    this._length = value;
  }
}

export class FixAverage extends FixLengthArray<number> {
  constructor(size: number) {
    super(size);
  }

  getAvg(): number {
    return this.reduce((a, b) => a + b, 0) / this.length;
  }
}
export class Average extends Array<number> {
  getAvg(): number {
    return this.reduce((a, b) => a + b, 0) / this.length;
  }
}
