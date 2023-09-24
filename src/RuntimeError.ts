import { Token } from "./token";

export class RuntimeError extends Error {
  token: Token;

  constructor(token: Token, message: string) {
    super(message)
    this.name = "RuntimeError";
    this.token = token;
  }
}

export class ReturnException extends Error {
  value: any;

  constructor(value: any) {
    super();
    this.value = value;
  }
}
