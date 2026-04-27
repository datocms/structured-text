export class DastdownParseError extends Error {
  public readonly line: number;
  public readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'DastdownParseError';
    this.line = line;
    this.column = column;
    Object.setPrototypeOf(this, DastdownParseError.prototype);
  }
}
