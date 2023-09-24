import type { Token } from "../src/token";

import type { Expr } from "../src/Expr";

export interface Visitor<R> {
   visitBlockStmt(stmt: Block): R;
   visitExpressionStmt(stmt: Expression): R;
   visitFunctionStmt(stmt: Function): R;
   visitIfStmt(stmt: If): R;
   visitPrintStmt(stmt: Print): R;
   visitVarStmt(stmt: Var): R;
   visitWhileStmt(stmt: While): R;
}

export abstract class Stmt {
   abstract accept<R>(visitor: Visitor<R>): R
}

export class Block extends Stmt {
   constructor(public statements: Stmt[],) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitBlockStmt(this);
   }
}

export class Expression extends Stmt {
   constructor(public expression: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitExpressionStmt(this);
   }
}

export class Function extends Stmt {
   constructor(public name: Token, public params: Token[], public body: Stmt[],) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitFunctionStmt(this);
   }
}

export class If extends Stmt {
   constructor(public condition: Expr, public thenBranch: Stmt, public elseBranch?: Stmt,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitIfStmt(this);
   }
}

export class Print extends Stmt {
   constructor(public expression: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitPrintStmt(this);
   }
}

export class Var extends Stmt {
   constructor(public name: Token, public initializer: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitVarStmt(this);
   }
}

export class While extends Stmt {
   constructor(public condition: Expr, public body: Stmt,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitWhileStmt(this);
   }
}

