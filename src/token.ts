import { TokenType } from "./token_type";

export class Token {
  constructor(public type: TokenType, public lexeme: string, public literal: any, public line: number) { }

  toString() {
    return `Token: { type: ${TokenType[this.type]}, lexeme: ${this.lexeme}, literal: ${this.literal}, line: ${this.line} })`;
  }
}
