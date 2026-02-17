import { AST } from "./ast";
import { CFG } from "./cfg";
import { CPAnalysis } from "./constant-propagation-analysis";
import { Executor } from "./executor";
import { FunctionRegistry } from "./function-registry";
import { FunctionRenamer } from "./function-renamer";
import { resetLabelNum, resetRegNum } from "./helper";
import { IR } from "./ir";
import { LabelResolver } from "./label-resolver";
import { optimize } from "./optimize";
import { Parser } from "./parser";
import { ReturnChecker } from "./return-check";
import { Tokenizer } from "./tokenizer";
import { translate } from "./translator";
import { typeCheck } from "./type-check";

function debug(source:string) {
    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenizeAll();
    //tokenizer.printTokens();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(AST.stringOfStmts(ast));

    typeCheck(ast);
    ReturnChecker.check(ast);
    console.log(AST.stringOfStmts(ast));

    FunctionRenamer.resetFunctionUid();
    FunctionRenamer.traverse(ast);

    resetLabelNum();
    resetRegNum();
    const code = translate(ast);
    console.log(IR.stringOfInstrs(code));

    const functionRegistry = FunctionRegistry.createRegistry(code);
    LabelResolver.resolveLabels(code);

    console.log(IR.stringOfInstrs(code));
    console.log(functionRegistry);

    const executor = new Executor(code, functionRegistry);
    executor.execute();

    const cfg = new CFG(code);
    console.log(`${cfg}`);
}

function optimizeAndDebug (source:string) {
    const tokenizer = new Tokenizer(source);
    const tokens = tokenizer.tokenizeAll();
    //tokenizer.printTokens();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(AST.stringOfStmts(ast));

    typeCheck(ast);
    ReturnChecker.check(ast);
    console.log(AST.stringOfStmts(ast));

    FunctionRenamer.resetFunctionUid();
    FunctionRenamer.traverse(ast);

    resetLabelNum();
    resetRegNum();
    let code = translate(ast);
    console.log(IR.stringOfInstrs(code));
    
    code = optimize(code);
    console.log(IR.stringOfInstrs(code));
    const cpa = new CPAnalysis(code);
    console.log(cpa.getInOut());

    const functionRegistry = FunctionRegistry.createRegistry(code);
    LabelResolver.resolveLabels(code);

    console.log(functionRegistry);

    const executor = new Executor(code, functionRegistry);
    executor.execute();
}

function optimizeAndRun(source:string, isTest:boolean) : string[] {
    const output:string[] = [];
    const printHandler = 
        (s:string) => {
            if (isTest)  {output.push(s);}
            else {console.log(s);}
        }

    try {
        const tokenizer = new Tokenizer(source);
        const tokens = tokenizer.tokenizeAll();

        const parser = new Parser(tokens);
        const ast = parser.parse();

        typeCheck(ast);
        ReturnChecker.check(ast);

        FunctionRenamer.resetFunctionUid();
        FunctionRenamer.traverse(ast);

        resetLabelNum();
        resetRegNum();
        let code = translate(ast);
        console.log(IR.stringOfInstrs(code));
        code = optimize(code);
        console.log(IR.stringOfInstrs(code));

        const functionRegistry = FunctionRegistry.createRegistry(code);
        LabelResolver.resolveLabels(code);

        const executor = new Executor(code, functionRegistry, printHandler);
        executor.execute();
    } catch (e) {
        output.push(`Error: ${(e as Error).message}`);
    }
    
    return output;
}


function run(source:string, isTest:boolean) : string[] {
    const output:string[] = [];
    const printHandler = 
        (s:string) => {
            if (isTest)  {output.push(s);}
            else {console.log(s);}
        }

    try {
        const tokenizer = new Tokenizer(source);
        const tokens = tokenizer.tokenizeAll();

        const parser = new Parser(tokens);
        const ast = parser.parse();

        typeCheck(ast);
        ReturnChecker.check(ast);

        FunctionRenamer.resetFunctionUid();
        FunctionRenamer.traverse(ast);

        resetLabelNum();
        resetRegNum();
        const code = translate(ast);

        const functionRegistry = FunctionRegistry.createRegistry(code);
        LabelResolver.resolveLabels(code);

        const executor = new Executor(code, functionRegistry, printHandler);
        executor.execute();
    } catch (e) {
        output.push(`Error: ${(e as Error).message}`);
    }
    
    return output;
}

export { debug, optimizeAndDebug, run, optimizeAndRun }