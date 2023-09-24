import fs from "node:fs";
const argv = process.argv;

main();
function main() {
  if (argv.length !== 3) {
    console.log("Usage: generate_ast <output directory>");
    process.exit(64);
  }

  const output_dir = argv[2];
  define_ast(output_dir, "Expr", [
    "Binary - left: Expr, operator: Token, right: Expr",
    "Call - callee: Expr, paren: Token, args: Expr[]",
    "Grouping - expression: Expr",
    "Literal - value: any",
    "Logical - left: Expr, operator: Token, right: Expr",
    "Unary - operator: Token, right: Expr",
    "Variable - name: Token",
    "Assign - name: Token, value: Expr",
  ]);

  define_ast(output_dir, "Stmt", [
    "Block - statements: Stmt[]",
    "Expression - expression: Expr",
    "Function - name: Token, params: Token[], body: Stmt[]",
    "If - condition: Expr, thenBranch: Stmt, elseBranch?: Stmt",
    "Print - expression: Expr",
    "Var - name: Token, initializer: Expr",
    "While - condition: Expr, body: Stmt",
  ])
}


function define_ast(output_dir: string, base_name: string, types: string[]) {

  const path = output_dir + "/" + base_name + ".ts";
  const code: string[] = []
  code.push(`import type { Token } from "../src/token";\n\n`)

  if (base_name === "Stmt") {
    code.push(`import type { Expr } from "../src/Expr";\n\n`)
  }

  define_visitor_interface(code, base_name, types);

  code.push(`export abstract class ${base_name} {\n`)
  code.push(`   abstract accept<R>(visitor: Visitor<R>): R\n`)
  code.push(`}\n\n`)


  for (const type of types) {
    const class_name = type.split("-")[0].trim();
    const fields = type.split("-")[1].trim();

    define_type(code, class_name, base_name, fields);
  }

  fs.writeFileSync(path, code.join(""))

}



function define_type(code: string[], class_name: string, base_name: string, field_list: string) {
  code.push(`export class ${class_name} extends ${base_name} {\n`);
  const fields = field_list.split(", ").reduce((acc, field) => {
    acc += `public ${field}, `;
    return acc;
  }, "")
  code.push(`   constructor(${fields}) {\n`);
  code.push(`     super()\n`)
  code.push(`   }\n`);
  code.push(`\n`);
  code.push(`   accept<R>(visitor: Visitor<R>) {\n`);
  code.push(`      return visitor.visit${class_name}${base_name}(this);\n`);
  code.push(`   }\n`)
  code.push(`}\n\n`);
}

function define_visitor_interface(code: string[], base_name: string, types: string[]) {
  code.push(`export interface Visitor<R> {\n`)
  for (const type of types) {
    const type_name = type.split("-")[0].trim();
    code.push(`   visit${type_name}${base_name}(${base_name.toLowerCase()}: ${type_name}): R;\n`)

  }
  code.push(`}\n\n`)
}

