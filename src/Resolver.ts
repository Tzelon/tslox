import * as Lox from "./lox"
import { Binary, Expr, Grouping, Literal, Unary, Visitor as ExprVisitor, Variable, Assign, Logical, Call } from "./Expr";
import { Block, Expression, Function, If, Print, Return, Stmt, Visitor as StmtVisitor, Var, While } from "./Stmt"
import { Interpreter } from "./interpreter";
import { Token } from "./token";

enum FunctionType {
  NONE,
  FUNCTION
}

export class Resolver implements ExprVisitor<any>, StmtVisitor<void> {
  interpreter: Interpreter;
  scopes: Map<string, boolean>[] = [];
  current_function = FunctionType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: Block): void {
    this.begin_scope();
    this.resolve(stmt.statements);
    this.end_scope();

    return null;
  }

  visitExpressionStmt(stmt: Expression): void {
    this.resolve(stmt.expression);

    return null;
  }

  visitFunctionStmt(stmt: Function): void {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolve_function(stmt, FunctionType.NONE);

    return null;
  }

  visitIfStmt(stmt: If): void {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);

    if (stmt.elseBranch !== null && stmt.elseBranch !== undefined) {
      this.resolve(stmt.elseBranch);
    }

    return null;
  }

  visitPrintStmt(stmt: Print): void {
    this.resolve(stmt.expression);

    return null;
  }

  visitReturnStmt(stmt: Return): void {
    if (this.current_function === FunctionType.NONE) {
      Lox.error(stmt.name, "Can't return from top-level code.")
    }
    if (stmt.value !== null && stmt.value !== undefined) {
      this.resolve(stmt.value);
    }

    return null;
  }

  visitWhileStmt(stmt: While): void {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);

    return null;
  }

  visitVarStmt(stmt: Var): void {
    this.declare(stmt.name);
    if (stmt.initializer !== null && stmt.initializer !== undefined) {
      this.resolve(stmt.initializer);
    }

    this.define(stmt.name);

    return null;
  }

  visitVariableExpr(expr: Variable) {
    if (this.scopes.length === 0 && this.scopes.at(-1).get(expr.name.lexeme) === false) {
      Lox.error(expr.name, "Cannot read local Variable in its own initializer.")
    }

    this.resolve_local(expr, expr.name);

    return null;
  }

  visitAssignExpr(expr: Assign) {
    this.resolve(expr.value);
    this.resolve_local(expr, expr.name);

    return null;
  }

  visitBinaryExpr(expr: Binary) {
    this.resolve(expr.left);
    this.resolve(expr.right);

    return null;
  }

  visitCallExpr(expr: Call) {
    this.resolve(expr.callee);

    for (const arg of expr.args) {
      this.resolve(arg)
    }

    return null;
  }

  visitGroupingExpr(expr: Grouping) {
    this.resolve(expr.expression);

    return null;
  }

  visitLiteralExpr(_expr: Literal) {
    return null;
  }

  visitLogicalExpr(expr: Logical) {
    this.resolve(expr.right);
    this.resolve(expr.left);

    return null;
  }

  visitUnaryExpr(expr: Unary) {
    this.resolve(expr.right);

    return null;
  }

  //utils

  resolve(statements: Stmt | Stmt[] | Expr) {
    if (statements instanceof Expr) {
      statements.accept(this);
    }
    const stmts = Array.isArray(statements) ? statements : [statements];

    for (const statement of stmts) {
      statement.accept(this);
    }
  }

  private resolve_function(func: Function, type: FunctionType) {
    let enclosing_function = this.current_function;
    this.current_function = type;
    this.begin_scope()
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }

    this.resolve(func.body);
    this.end_scope();

    this.current_function = enclosing_function;
  }

  private resolve_local(expr: Expr, name: Token) {
    for (let index = this.scopes.length - 1; index >= 0; index--) {
      if (this.scopes.at(index).has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - index);
        return;
      }
    }
  }

  private begin_scope() {
    this.scopes.push(new Map<string, boolean>())
  }

  private end_scope() {
    this.scopes.pop();
  }

  private declare(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes.at(-1);
    if (scope.has(name.lexeme)) {
      Lox.error(name, "Already a variable with this name in this scope.");
    }
    scope.set(name.lexeme, false);
  }
  private define(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes.at(-1);
    scope.set(name.lexeme, true);

  }
}
