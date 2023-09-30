import { Callable } from "./Callable";
import { LoxInstance } from "./LoxInstance";
import { ReturnException, RuntimeError } from "./RuntimeError";
import { Function } from "./Stmt";
import { Environment } from "./environment";
import { Interpreter } from "./interpreter";

export class LoxFunction extends Callable {
  declaration: Function;
  closure: Environment;
  is_initializer: boolean;

  constructor(declaration: Function, closure: Environment, is_initializer: boolean) {
    super();
    this.declaration = declaration;
    this.closure = closure;
    this.is_initializer = is_initializer
  }

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: unknown[]): unknown {
    const environment = new Environment(this.closure);

    for (let index = 0; index < this.declaration.params.length; index++) {
      environment.define(this.declaration.params.at(index).lexeme, args.at(index));
    }

    try {
      interpreter.execute_block(this.declaration.body, environment);
    } catch (err) {
      if (err instanceof ReturnException) {

        if (this.is_initializer) return this.closure.get_at(0, "this");

        return err.value;
      }
      throw err;
    }

    if (this.is_initializer) return this.closure.get_at(0, "this");
    return null;
  }

  bind(instance: LoxInstance) {
    const environment = new Environment(this.closure);
    environment.define("this", instance);

    return new LoxFunction(this.declaration, environment, this.is_initializer);
  }

  toString() {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
