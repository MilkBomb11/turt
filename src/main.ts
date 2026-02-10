import { AST } from "./ast";
import { Executor } from "./executor";
import { FunctionRegistry } from "./function-registry";
import { FunctionRenamer } from "./function-renamer";
import { resetLabelNum, resetRegNum } from "./helper";
import { IR } from "./ir";
import { LabelResolver } from "./label-resolver";
import { Parser } from "./parser";
import { ReturnChecker } from "./return-check";
import { Tokenizer } from "./tokenizer";
import { translate } from "./translator";
import { typeCheck } from "./type-check";

const textarea = document.querySelector<HTMLTextAreaElement>("#text")!
const go_btn = document.querySelector<HTMLButtonElement>("#btn-play")!
const debug = true;

function run() {
    const tokenizer = new Tokenizer(textarea.value);
    const tokens = tokenizer.tokenizeAll();
    //tokenizer.printTokens();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    if (debug) {console.log(AST.stringOfStmts(ast));}

    typeCheck(ast);
    ReturnChecker.check(ast);
    if (debug) {console.log(AST.stringOfStmts(ast));}

    FunctionRenamer.resetFunctionUid();
    FunctionRenamer.traverse(ast);

    resetLabelNum();
    resetRegNum();
    const code = translate(ast);
    if (debug) {console.log(IR.stringOfInstrs(code));}

    const functionRegistry = FunctionRegistry.createRegistry(code);
    LabelResolver.resolveLabels(code);

    if (debug) {
      console.log(IR.stringOfInstrs(code));
      console.log(functionRegistry);
    }

    const executor = new Executor(code, functionRegistry);
    executor.execute();
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

fn main() : int {
  let x:int = 0;
  while (x < 6) {
    print (x);
    x = aux(x);
  }
  
  fn aux(x:int) : int {
     x = x + 1;
     return x;
  }
}
 * **/