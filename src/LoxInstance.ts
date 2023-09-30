import { LoxClass } from "./LoxClass";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class LoxInstance {
  klass: LoxClass;
  fields: Map<string, any> = new Map();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.find_method(name.lexeme);
    if (method !== null) return method;

    throw new RuntimeError(name, "Undefined property '" + name.lexeme + "'.")
  }

  set(name: Token, value: any) {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return this.klass.name + " instance";
  }
}
