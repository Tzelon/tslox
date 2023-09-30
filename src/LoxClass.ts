
import { Callable } from "./Callable";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";
import { Interpreter } from "./interpreter";

export class LoxClass extends Callable {
  name: string;
  methods: Map<string, LoxFunction>;

  constructor(name: string, methods: Map<string, LoxFunction>) {
    super()
    this.methods = methods
    this.name = name;
  }

  call(interpreter: Interpreter, args: unknown[]): unknown {
    const instance = new LoxInstance(this);

    return instance;
  }

  arity(): number {
    return 0;
  }

  find_method(name: string): LoxFunction | null {
    if (this.methods.has(name)) {
      return this.methods.get(name)
    }

    return null;
  }

  toString() {
    return this.name
  }
}
