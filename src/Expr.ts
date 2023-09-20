import type { Token } from "../src/token";

export interface Visitor<R> {
   visitBinaryExpr(expr: Binary): R;
   visitGroupingExpr(expr: Grouping): R;
   visitLiteralExpr(expr: Literal): R;
   visitLogicalExpr(expr: Logical): R;
   visitUnaryExpr(expr: Unary): R;
   visitVariableExpr(expr: Variable): R;
   visitAssignExpr(expr: Assign): R;
}

export abstract class Expr {
   abstract accept<R>(visitor: Visitor<R>): R
}

export class Binary extends Expr {
   constructor(public left: Expr, public operator: Token, public right: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitBinaryExpr(this);
   }
}

export class Grouping extends Expr {
   constructor(public expression: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitGroupingExpr(this);
   }
}

export class Literal extends Expr {
   constructor(public value: any,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitLiteralExpr(this);
   }
}

export class Logical extends Expr {
   constructor(public left: Expr, public operator: Token, public right: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitLogicalExpr(this);
   }
}

export class Unary extends Expr {
   constructor(public operator: Token, public right: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitUnaryExpr(this);
   }
}

export class Variable extends Expr {
   constructor(public name: Token,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitVariableExpr(this);
   }
}

export class Assign extends Expr {
   constructor(public name: Token, public value: Expr,) {
      super()
   }

   accept<R>(visitor: Visitor<R>) {
      return visitor.visitAssignExpr(this);
   }
}

