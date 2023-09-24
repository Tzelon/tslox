import { Interpreter } from "./interpreter";

export abstract class Callable {
  abstract call(interpreter: Interpreter, args: unknown[]): unknown;
  abstract arity(): number;
}
