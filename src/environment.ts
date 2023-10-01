import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class Environment {
  public readonly enclosing: Environment | null;
  private values: Map<string, any> = new Map();

  constructor(enclosing: Environment = null) {
    this.enclosing = enclosing;
  }

  define(name: string, value: any) {
    this.values.set(name, value);
  }

  get(name: Token) {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing != null) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + "'.");
  }

  get_at(distance: number, name: string) {
    return this.ancestor(distance).values.get(name);
  }

  assign(name: Token, value: any) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value)
      return;
    }

    if (this.enclosing != null) {
      this.enclosing.assign(name, value)
      return;
    }

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + "'.");
  }

  assign_at(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  private ancestor(distance: number) {
    let environment: Environment = this;
    for (let index = 0; index < distance; index++) {
      environment = environment.enclosing;
    }

    return environment;
  }
}
