import type { Expr } from "../src/Expr";

export interface Visitor<R> {
   visitExpressionStmt(stmt: Expression): R;
   visitPrintStmt(stmt: Print): R;
}

export abstract class Stmt {
   abstract accept<R>(visitor: Visitor<R>): R
}

export class Expression extends Stmt {
   constructor(public expression: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitExpressionStmt(this);
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

