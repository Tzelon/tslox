import type { Token } from "./token";
import * as Lox from "./lox";
import { Binary, Expr, Grouping, Literal, Unary } from "./Expr";
import { TokenType } from "./token_type";

export class Parser {
  private tokens: Token[] = [];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse() {
    try {
      return this.expression();
    } catch (error) {
      if (error instanceof ParseError) {
        return null;
      }

      return null;
    }
  }
  private expression(): Expr {
    return this.equality();
  }

  private equality(): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right)
    }

    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr {
    while (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.primary();
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expresssion.");
  }


  //====== UTILS =====
  private match(...types: TokenType[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }

    }
    return false;
  }

  private check(type: TokenType) {
    if (this.is_at_end()) return false;
    return this.peek().type === type;
  }

  private advance() {
    if (!this.is_at_end()) this.current++;
    return this.previous();
  }

  private is_at_end() {
    return this.peek().type === TokenType.EOF;
  }

  private peek() {
    const item = this.tokens.at(this.current);
    if (item === undefined) {
      throw new Error("IndexOutOfBoundsException");
    }
    return item;
  }

  private previous() {
    const item = this.tokens.at(this.current - 1);
    if (item === undefined) {
      throw new Error("IndexOutOfBoundsException");
    }
    return item;
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string) {
    Lox.error(token, message)
    return new ParseError();
  }

  /**
   * Discards tokens until it thinks it has found a statement boundary.
   */
  private synchronize() {
    this.advance();

    while (!this.is_at_end()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }
}


class ParseError extends Error { }
