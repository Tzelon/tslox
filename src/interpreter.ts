import * as Lox from "./lox"
import { Binary, Expr, Grouping, Literal, Unary, Visitor } from "./Expr";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./token_type";

export class Interpreter implements Visitor<any> {

  interpret(expression: Expr): void {
    try {
      const value = this.evaluate(expression);
      console.log(this.stringify(value))
    } catch (err) {
      if (err instanceof RuntimeError) {
        Lox.runtime_error(err)
      }
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
        return !this.it_truthy(right);
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
  private it_truthy(object: any) {
    if (object === null || object === undefined) return false;
    if (object instanceof Boolean) return Boolean(object);

    return true;
  }

  private evaluate(expr: Expr) {
    return expr.accept(this)
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
