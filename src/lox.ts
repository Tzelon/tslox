import { readFileSync } from "node:fs";
import { stdin, stdout } from "node:process"
import * as readLine from "node:readline/promises"
import { AstPrinter } from "./ast_printer"
import { Scanner } from "./scanner"
import { Token } from "./token";
import { TokenType } from "./token_type";
import { Parser } from "./parser";
import { RuntimeError } from "./RuntimeError";
import { Interpreter } from "./interpreter";
import { Resolver } from "./Resolver";

const interpreter = new Interpreter();
let had_error = false;
let had_runtime_error = false;

function main(args: string[]) {
  console.info("run with args: ", args);
  if (args.length > 3) {
    console.log("Usage: jlox [script]");
    process.exit(64);
  } else if (args.length === 3) {
    run_file(args[2]);
  } else {
    run_prompt();
  }
}

function run_file(path: string) {
  const source = readFileSync(path, { encoding: "utf-8" });
  run(source);

  if (had_error) {
    process.exit(65)
  }
  if (had_runtime_error) {
    process.exit(70)
  }
}

async function run_prompt() {
  const rl = readLine.createInterface({ input: stdin, output: stdout })
  while (true) {
    const line = await rl.question("> ");

    if (line === null || line === undefined) {
      break;
    }

    run(line)
    had_error = false;
  }
}

function run(source: string) {
  const scanner = new Scanner(source);
  const tokens = scanner.scan_tokens();

  const parser = new Parser(tokens);
  const statements = parser.parse();

  if (had_error || statements === null) return;
  const resolver = new Resolver(interpreter);
  resolver.resolve(statements);

  if (had_error || statements === null) return;
  interpreter.interpret(statements);
}

export function error(line: Token | number, message: string) {
  if (typeof line === "number") {
    report(line, "", message)
  } else if (line.type === TokenType.EOF) {
    report(line.literal, " at end", message)
  } else {
    report(line.line, ` at '${line.lexeme}'`, message)
  }
}

export function runtime_error(error: RuntimeError) {
  console.error(error.message + "\n[line " + error.token.line + "]");

  had_runtime_error = true;
}

function report(line: number, where: string, message: string) {
  console.error(`[line ${line}] Error ${where}: ${message}`)
  had_error = true;
}


main(process.argv);
