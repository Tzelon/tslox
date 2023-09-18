import { Visitor, Expr, Unary, Binary, Grouping, Literal } from "./Expr"

export class AstPrinter implements Visitor<string> {
  print(expr: Expr) {
    return expr.accept(this)
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) return "nil";

    return expr.value.toString();
  }

  visitUnaryExpr(expr: Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }

  private parenthesize(name: string, ...exprs: Expr[]) {
    const code: string[] = [];

    code.push("(")
    code.push(name)
    for (const expr of exprs) {
      code.push(" ")
      code.push(expr.accept(this))
    }
    code.push(")")

    return code.join("");
  }
}

