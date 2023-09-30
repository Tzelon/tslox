
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
    const initializer = this.find_method("init");

    if (initializer) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  arity(): number {
    const initializer = this.find_method("init");
    if (!initializer) return 0;

    return initializer.arity();
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
