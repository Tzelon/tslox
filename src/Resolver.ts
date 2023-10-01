import * as Lox from "./lox"
import { Binary, Expr, Grouping, Literal, Unary, Visitor as ExprVisitor, Variable, Assign, Logical, Call, Get, Set, This, Super } from "./Expr";
import { Block, Class, Expression, Function, If, Print, Return, Stmt, Visitor as StmtVisitor, Var, While } from "./Stmt"
import { Interpreter } from "./interpreter";
import { Token } from "./token";

enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  METHOD
}

enum ClassType {
  NONE,
  CLASS,
  SUBCLASS
}

export class Resolver implements ExprVisitor<any>, StmtVisitor<void> {
  interpreter: Interpreter;
  scopes: Map<string, boolean>[] = [];
  current_function = FunctionType.NONE;
  current_class = ClassType.NONE;

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
      if (this.current_function === FunctionType.INITIALIZER) {
        Lox.error(stmt.name, "Can't return from an initializer.")
      }
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


  visitClassStmt(stmt: Class): void {
    const enclosing_class = this.current_class;
    this.current_class = ClassType.CLASS;

    this.declare(stmt.name);
    this.define(stmt.name);


    if (stmt.superclass && stmt.name.lexeme === stmt.superclass.name.lexeme) {
      Lox.error(stmt.superclass.name, "A c;ass can't inherit from itself.");
    }

    if (stmt.superclass) {
      this.current_class = ClassType.SUBCLASS;
      this.resolve(stmt.superclass);
    }

    if (stmt.superclass) {
      this.begin_scope();
      this.scopes.at(-1).set("super", true);
    }

    this.begin_scope();
    this.scopes.at(-1).set("this", true);

    for (const method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "init") {
        declaration = FunctionType.INITIALIZER
      }

      this.resolve_function(method, declaration)
    }

    this.end_scope();

    if (stmt.superclass) { this.end_scope(); }
    this.current_class = enclosing_class;

    return null;
  }

  visitSuperExpr(expr: Super) {
    if (this.current_class === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'super' outside of a class.");
    } else if (this.current_class !== ClassType.SUBCLASS) {
      Lox.error(expr.keyword, "Can't use 'super' in a class with no superclass.");
    }
    this.resolve_local(expr, expr.keyword);

    return null;
  }

  visitVariableExpr(expr: Variable) {
    if (this.scopes.length === 0 && this.scopes.at(-1)?.get(expr.name.lexeme) === false) {
      Lox.error(expr.name, "Cannot read local Variable in its own initializer.")
    }

    this.resolve_local(expr, expr.name);

    return null;
  }

  visitGetExpr(expr: Get) {
    this.resolve(expr.obj);

    return null;
  }

  visitSetExpr(expr: Set) {
    this.resolve(expr.value);
    this.resolve(expr.obj);

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

  visitThisExpr(expr: This) {
    if (this.current_class === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'this' outside of a class.")
    }

    this.resolve_local(expr, expr.keyword);

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
