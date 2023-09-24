import { Callable } from "./Callable";
import { ReturnException, RuntimeError } from "./RuntimeError";
import { Function } from "./Stmt";
import { Environment } from "./environment";
import { Interpreter } from "./interpreter";

export class LoxFunction extends Callable {
  declaration: Function;
  closure: Environment;

  constructor(declaration: Function, closure: Environment) {
    super();
    this.declaration = declaration;
    this.closure = closure;
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
        return err.value;
      }
      throw err;
    }

    return null;
  }

  toString() {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
