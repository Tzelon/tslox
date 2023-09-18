import { Token } from "./token";
import { TokenType } from "./token_type";
import * as lox from "./lox"

export class Scanner {
  private source: string;
  private tokens: Token[] = []
  private start = 0;
  private current = 0;
  private line = 1;

  static keywords = new Map<string, TokenType>([
    ["and", TokenType.AND],
    ["class", TokenType.CLASS],
    ["else", TokenType.ELSE],
    ["false", TokenType.FALSE],
    ["for", TokenType.FOR],
    ["fun", TokenType.FUN],
    ["if", TokenType.IF],
    ["nil", TokenType.NIL],
    ["or", TokenType.OR],
    ["print", TokenType.PRINT],
    ["return", TokenType.RETURN],
    ["super", TokenType.SUPER],
    ["this", TokenType.THIS],
    ["true", TokenType.TRUE],
    ["var", TokenType.VAR],
    ["while", TokenType.WHILE],
  ])

  constructor(source: string) {
    this.source = source;
  }

  scan_tokens() {
    while (!this.is_at_end()) {
      this.start = this.current;
      this.scan_token();
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line))
    return this.tokens;
  }


  private scan_token() {
    const c = this.advance()

    switch (c) {
      case '(': this.add_token(TokenType.LEFT_PAREN); break;
      case ')': this.add_token(TokenType.RIGHT_PAREN); break;
      case '{': this.add_token(TokenType.LEFT_BRACE); break;
      case '}': this.add_token(TokenType.RIGHT_BRACE); break;
      case ',': this.add_token(TokenType.COMMA); break;
      case '.': this.add_token(TokenType.DOT); break;
      case '-': this.add_token(TokenType.MINUS); break;
      case '+': this.add_token(TokenType.PLUS); break;
      case ';': this.add_token(TokenType.SEMICOLON); break;
      case '*': this.add_token(TokenType.STAR); break;
      case '!':
        this.add_token(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case '=':
        this.add_token(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      case '<':
        this.add_token(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case '>':
        this.add_token(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      case '/':
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (this.peek() !== '\n' && !this.is_at_end()) {
            this.advance();
          }
        } else {
          this.add_token(TokenType.SLASH)
        }
        break;
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;
      case '\n':
        this.line++;
        break;
      case '"': this.text(); break;

      default:
        if (this.is_digit(c)) {
          this.number();
        } else if (this.is_alpha(c)) {
          this.identifier();
        } else {
          lox.error(this.line, "Unexpected character.")
        }
        break;
    }
  }

  private text() {
    while (this.peek() !== '"' && !this.is_at_end()) {
      // support multi line string
      if (this.peek() == '\n') this.line++;

      this.advance();
    }

    if (this.is_at_end()) {
      lox.error(this.line, "Unterminated text.");
      return;
    }

    // The closing ".
    this.advance()


    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.add_token(TokenType.STRING, value);
  }

  private number() {
    while (this.is_digit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.is_digit(this.peek_next())) {
      // consume the "."
      this.advance();

      while (this.is_digit(this.peek())) {
        this.advance();
      }
    }


    this.add_token(TokenType.NUMBER, Number.parseFloat(this.source.substring(this.start, this.current)));
  }

  private identifier() {
    while (this.is_alpha_numeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);
    const type = Scanner.keywords.get(text);
    if (type === undefined) {
      this.add_token(TokenType.IDENTIFIER);
    } else {
      this.add_token(type);
    }
  }

  private advance() {
    return this.source.charAt(this.current++)
  }

  private add_token(type: TokenType, literal: any = null) {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line))
  }


  private match(expected: string) {
    if (this.is_at_end()) return false;
    if (this.source.charAt(this.current) !== expected) return false;

    this.current++;
    return true;
  }

  private peek() {
    if (this.is_at_end()) return '\0';
    return this.source.charAt(this.current);
  }

  private peek_next() {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private is_digit(c: string) {
    return c >= '0' && c <= '9'
  }

  private is_alpha(c: string) {
    return (c >= 'a' && c <= 'z' ||
      c >= 'A' && c <= 'Z' ||
      c == '_')
  }

  private is_alpha_numeric(c: string) {
    return this.is_alpha(c) || this.is_digit(c);
  }

  is_at_end() {
    return this.current >= this.source.length;
  }


}
