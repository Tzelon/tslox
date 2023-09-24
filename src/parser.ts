import type { Token } from "./token";
import { Block, Expression, Function, If, Print, Return, Stmt, Var, While } from "./Stmt";
import * as Lox from "./lox";
import { Assign, Binary, Call, Expr, Grouping, Literal, Logical, Unary, Variable } from "./Expr";
import { TokenType } from "./token_type";

export class Parser {
  private tokens: Token[] = [];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse() {
    const statements: Stmt[] = [];
    while (!this.is_at_end()) {
      statements.push(this.declaration());
    }

    return statements;
  }

  private declaration(): Stmt {
    try {
      if (this.match(TokenType.FUN)) return this.fun("function");
      if (this.match(TokenType.VAR)) return this.var_declaration();

      return this.statement();
    } catch (err) {
      if (err instanceof ParseError) {
        this.synchronize();
        return null
      }
    }
  }

  private fun(kind: string) {
    const name = this.consume(TokenType.IDENTIFIER, "Expect " + kind + " name.");

    this.consume(TokenType.LEFT_PAREN, "Expect '(' after function name")
    let params: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 parameters.");
        }
        params.push(this.consume(TokenType.IDENTIFIER, "Expect parameters name."));

      } while (this.match(TokenType.COMMA))
    }


    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

    this.consume(TokenType.LEFT_BRACE, "Expect '{' before " + kind + " body.");
    const body = this.block();

    return new Function(name, params, body);
  }

  private var_declaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

    let initializer: Expr = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  private statement(): Stmt {
    if (this.match(TokenType.FOR)) return this.for_statement();
    if (this.match(TokenType.IF)) return this.if_statement();
    if (this.match(TokenType.PRINT)) return this.print_statement();
    if (this.match(TokenType.RETURN)) return this.return_statement();
    if (this.match(TokenType.WHILE)) return this.while_statement();
    if (this.match(TokenType.LEFT_BRACE)) return new Block(this.block());

    return this.expression_statement();
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.is_at_end()) {
      statements.push(this.declaration())
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")

    return statements;
  }

  private if_statement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after if.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");

    const then_branch = this.statement();
    let else_branch: Stmt = null;
    if (this.match(TokenType.ELSE)) {
      else_branch = this.statement();
    }

    return new If(condition, then_branch, else_branch);
  }

  private print_statement(): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Print(value);
  }

  private for_statement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.")

    let initializer: Stmt = null;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.var_declaration();
    } else {
      initializer = this.expression_statement();
    }

    let condition: Expr = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.")

    let increment: Expr = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }

    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");
    let body = this.statement();

    //desugraing for loop to while loop
    // working backward from increment

    if (increment !== null) {
      body = new Block([body, new Expression(increment)])
    }

    if (condition == null) {
      condition = new Literal(true)
    }

    body = new While(condition, body)

    if (initializer !== null) {
      body = new Block([initializer, body])
    }

    return body;
  }

  private while_statement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.")
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.")

    const body = this.statement();

    return new While(condition, body);
  }

  private return_statement(): Stmt {
    const keyword = this.previous();

    let value: Expr = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression()
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.")

    return new Return(keyword, value);
  }

  private expression_statement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new Expression(expr);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right)
    }

    return expr
  }

  private and(): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right)
    }

    return expr;
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

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finish_call(expr)
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expresssion.");
  }


  //====== UTILS =====
  /**
   * **advance** until a token is not equal to the given token sequence.
   * return `true` if the squence of tokens are equal.
   * Else return `false`.
   */
  private match(...types: TokenType[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }

    }
    return false;
  }

  /*
   * return `true` if the given token is equal to the current one.
   */
  private check(type: TokenType) {
    if (this.is_at_end()) return false;
    return this.peek().type === type;
  }

  /*
   * **advance** and return the last token;
   */
  private advance() {
    if (!this.is_at_end()) this.current++;
    return this.previous();
  }

  private is_at_end() {
    return this.peek().type === TokenType.EOF;
  }

  /*
   * return the current token in the sequence.
   * without **advancing**
   */
  private peek() {
    const item = this.tokens.at(this.current);
    if (item === undefined) {
      throw new Error("IndexOutOfBoundsException");
    }
    return item;
  }

  /*
   * return the previous token in the sequence.
   */
  private previous() {
    const item = this.tokens.at(this.current - 1);
    if (item === undefined) {
      throw new Error("IndexOutOfBoundsException");
    }
    return item;
  }

  private finish_call(callee: Expr): Expr {
    const args: Expr[] = []

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Cannot have more than 255 arguments.")
        }
        args.push(this.expression());
      } while (this.match(TokenType.COMMA))
    }

    const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

    return new Call(callee, paren, args);
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
