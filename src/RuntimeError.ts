import { Token } from "./token";

export class RuntimeError extends Error {
  token: Token;

  constructor(token: Token, message: string) {
    super(message)
    this.name = "RuntimeError";
    this.token = token;
  }
}
