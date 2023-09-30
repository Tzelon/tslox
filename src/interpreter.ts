import * as Lox from "./lox"
import { Callable } from "./Callable"
import { Binary, Expr, Grouping, Literal, Unary, Visitor as ExprVisitor, Variable, Assign, Logical, Call, Get, Set, This } from "./Expr";
import { Block, Class, Expression, Function, If, Print, Return, Stmt, Visitor as StmtVisitor, Var, While } from "./Stmt"
import { ReturnException, RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./token_type";
import { Environment } from "./environment";
import { LoxFunction } from "./LoxFunction";
import { LoxClass } from "./LoxClass";
import { LoxInstance } from "./LoxInstance";

export class Interpreter implements ExprVisitor<any>, StmtVisitor<void> {

  globals = new Environment();
  private environment = this.globals;
  private locals: WeakMap<Expr, number> = new WeakMap();

  constructor() {
    this.globals.define("clock", new class extends Callable {
      arity(): number {
        return 0;
      }

      call(_interpreter: Interpreter, _args: unknown[]): unknown {
        return Date.now() / 1000;
      }

      toString() {
        return "<native fn>"
      }
    })
  }

  interpret(statements: Stmt[]): void {
    try {
      for (const statement of statements) {
        this.execute(statement)
      }
    } catch (err) {
      if (err instanceof RuntimeError) {
        Lox.runtime_error(err)
      }

      console.error(err)
    }
  }

  visitLiteralExpr(expr: Literal) {
    return expr.value;
  }

  visitGroupingExpr(expr: Grouping) {
    return this.evaluate(expr.expression)
  }

  visitUnaryExpr(expr: Unary) {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.is_truthy(right);
      case TokenType.MINUS:
        this.assert_number_operand(expr.operator, right)
        return -Number(right)
    }

    // Unreachable.
    return null;
  }

  visitBinaryExpr(expr: Binary) {
    const left = this.evaluate(expr.left)
    const right = this.evaluate(expr.right)

    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) > Number(right)
      case TokenType.GREATER_EQUAL:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) >= Number(right)
      case TokenType.LESS:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) < Number(right)
      case TokenType.LESS_EQUAL:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) <= Number(right)
      case TokenType.EQUAL_EQUAL:
        return this.is_equal(left, right)
      case TokenType.BANG_EQUAL:
        return !this.is_equal(left, right)
      case TokenType.MINUS:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) - Number(right)
      case TokenType.PLUS: {
        if (typeof left === "number" && typeof right === "number") {
          return Number(left) + Number(right)
        }

        if (typeof left === "string" && typeof right === "string") {
          return String(left) + String(right)
        }

        throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings.")
      }
      case TokenType.SLASH:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) / Number(right)
      case TokenType.STAR:
        this.assert_number_operands(expr.operator, left, right);
        return Number(left) * Number(right)

    }

    // Unreachable.
    return null;
  }

  visitVariableExpr(expr: Variable) {
    return this.look_up_variable(expr.name, expr)
  }

  visitAssignExpr(expr: Assign) {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);

    if (distance !== undefined) {
      this.environment.assign_at(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }

  visitCallExpr(expr: Call) {
    const callee = this.evaluate(expr.callee);

    const args: any[] = [];
    for (const arg of expr.args) {
      args.push(this.evaluate(arg));
    }


    if (!(callee instanceof Callable)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes.")
    }

    const func = callee as Callable;

    if (args.length !== func.arity()) {
      throw new RuntimeError(expr.paren, "Expected " + func.arity() + " arguments but got " + args.length + ".");
    }
    return func.call(this, args);
  }

  visitGetExpr(expr: Get) {
    const obj = this.evaluate(expr.obj);
    if (obj instanceof LoxInstance) {
      return obj.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitSetExpr(expr: Set) {
    const obj = this.evaluate(expr.obj);

    if (!(obj instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const value = this.evaluate(expr.value);
    obj.set(expr.name, value);

    return value;
  }

  visitExpressionStmt(stmt: Expression): void {
    this.evaluate(stmt.expression);
    return undefined
  }

  visitPrintStmt(stmt: Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));

    return undefined;
  }

  visitVarStmt(stmt: Var): void {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }
    this.environment.define(stmt.name.lexeme, value)

    return undefined;
  }

  visitBlockStmt(stmt: Block): void {
    this.execute_block(stmt.statements, new Environment(this.environment))
    return null
  }

  visitIfStmt(stmt: If): void {
    if (this.is_truthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch)
    } else if (stmt.elseBranch !== undefined && stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch)
    }

    return null
  }

  visitLogicalExpr(expr: Logical) {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.is_truthy(left)) return left;
    } else {
      if (!this.is_truthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitWhileStmt(stmt: While): void {
    while (this.is_truthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body)
    }

    return null
  }

  visitClassStmt(stmt: Class): void {
    this.environment.define(stmt.name.lexeme, null);

    const methods: Map<string, LoxFunction> = new Map();

    for (const method of stmt.methods) {
      const func = new LoxFunction(method, this.environment, method.name.lexeme === "init");
      methods.set(method.name.lexeme, func);

    }

    const klass = new LoxClass(stmt.name.lexeme, methods);
    this.environment.assign(stmt.name, klass);

    return null;
  }

  visitThisExpr(expr: This) {
    return this.look_up_variable(expr.keyword, expr);
  }

  visitFunctionStmt(stmt: Function): void {
    //passing the environment that is active when the function is declared.
    // NOT when it's called
    const func = new LoxFunction(stmt, this.environment, false);
    this.environment.define(stmt.name.lexeme, func)

    return null;
  }

  visitReturnStmt(stmt: Return): void {
    let value = null;
    if (stmt.value !== null) {
      value = this.evaluate(stmt.value);
    }

    throw new ReturnException(value);
  }

  private look_up_variable(name: Token, expr: Expr) {
    const distance = this.locals.get(expr);

    if (distance !== undefined) {
      return this.environment.get_at(distance, name.lexeme);
    } else {
      return this.globals.get(name)
    }
  }

  private assert_number_operand(operator: Token, operand: unknown) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.")
  }

  private assert_number_operands(operator: Token, left: unknown, right: unknown) {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.")
  }

  private is_equal(left: any, right: any) {
    if ((left === null || left === undefined) && (right === null && right === undefined)) {
      return true;
    }
    if (left === null || left === undefined) {
      return false;
    }

    return left === right;
  }

  // null, undefined and false are falsey anything else are turthy
  private is_truthy(object: any) {
    if (object === null || object === undefined) return false;
    if (typeof object === "boolean") return Boolean(object);

    return true;
  }

  private evaluate(expr: Expr) {
    return expr.accept(this)
  }

  execute_block(statements: Stmt[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;
      for (const statement of statements) {
        this.execute(statement)
      }
    } finally {
      this.environment = previous;
    }
  }

  private execute(stmt: Stmt) {
    stmt.accept(this);
  }

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  private stringify(object: any) {
    if (object === null || object === undefined) return "nil";

    // if (object instanceof Number) {
    //   let text = String(object);
    //   if (text.startsWith(".0")) {
    //     text = text.substring(0, text.length - 2);
    //   }
    //   return text
    // }

    return String(object)
  }
}
