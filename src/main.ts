import { AST } from "./ast";
import { FunctionRenamer } from "./function-renamer";
import { resetLabelNum, resetRegNum } from "./helper";
import { IR } from "./ir";
import { JumpContext } from "./jmp-context";
import { Parser } from "./parser";
import { SymbolTable } from "./symbol-table";
import { Tokenizer } from "./tokenizer";
import { translateStmts } from "./translator";
import { typeCheckStmts } from "./type-check";

const textarea = document.querySelector<HTMLTextAreaElement>("#text")!
const go_btn = document.querySelector<HTMLButtonElement>("#btn-play")!

function run() {
    const tokenizer = new Tokenizer(textarea.value);
    const tokens = tokenizer.tokenizeAll();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    typeCheckStmts(ast, undefined, new SymbolTable(undefined));

    FunctionRenamer.resetFunctionUid();
    FunctionRenamer.traverseStmts(ast, new SymbolTable(undefined));

    resetLabelNum();
    resetRegNum();
    const code = translateStmts(ast, new SymbolTable(undefined), new JumpContext(undefined));

    console.log(AST.stringOfStmts(ast));
    console.log(IR.stringOfInstrs(code, ""));
    console.log(ast);
    console.log(code);
}

go_btn.addEventListener("click", run)

/***
fn x(y:int, z:int) : int ptr {
  if (x == y) {return x;}
  else {
  while (x < y) {
   x = x + 1;
   x = 5;
    }
  }
  return z;
}
 * **/