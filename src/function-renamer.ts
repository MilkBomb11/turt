import type { AST } from "./ast";
import { assertUnreachable } from "./helper";
import { SymbolTable } from "./symbol-table";

namespace FunctionRenamer {
    let functionUid = 0;
    export function resetFunctionUid() : void {functionUid = 0;}

    function getUniqueName(name: string) : string {
        return `${name}_#${functionUid++}`;
    }

    function collectFnDecl (stmts:AST.Stmt[], env:SymbolTable<string>) : SymbolTable<string> {
        for (const s of stmts) {
            if (s.kind === "FnDecl") {
                const newName = getUniqueName(s.name);
                env.define(s.name, newName);
                s.name = newName;
            }
        }
        return env;
    }

    function traverseExpr (expr:AST.Expr, env:SymbolTable<string>) : void {
        switch (expr.kind) {
            case "Call": {
                const newName = env.lookup(expr.calleeName);
                if (newName !== undefined) {expr.calleeName = newName;}
                for (const arg of expr.args) {traverseExpr(arg, env);}
                break;
            }
            case "Assign": traverseExpr(expr.expr, env); break;
            case "UnOp": traverseExpr(expr.operand, env); break;
            case "Cast": traverseExpr(expr.left, env); break;
            case "Deref": traverseExpr(expr.operand, env); break;
            case "BinOp": {
                traverseExpr(expr.left, env);
                traverseExpr(expr.right, env);
                break;
            }
            case "PtrUpdate": {
                traverseExpr(expr.left, env);
                traverseExpr(expr.right, env);
                break;
            }
            case "AddrOf": case "Const" : case "Var" : break;
            default: assertUnreachable(expr);
        }
    }

    function traverseStmt (stmt:AST.Stmt, env:SymbolTable<string>) : void {
        switch (stmt.kind) {
            case "FnDecl": {
                const bodyEnv = new SymbolTable(env);
                traverseStmt(stmt.body, bodyEnv);
                break;
            }
            case "Block": {
                const bodyEnv = new SymbolTable(env);
                traverseStmts(stmt.stmts, bodyEnv); 
                break;
            }
            case "If": {
                traverseExpr(stmt.cond, env);
                const trueArmEnv = new SymbolTable(env);
                traverseStmt(stmt.true_arm, trueArmEnv);
                const falseArmEnv = new SymbolTable(env);
                traverseStmt(stmt.false_arm, falseArmEnv);
                break;
            }
            case "While": {
                traverseExpr(stmt.cond, env);
                const bodyEnv = new SymbolTable(env);
                traverseStmt(stmt.body, bodyEnv);
                break;
            }
            case "ExprStmt": traverseExpr(stmt.expr, env); break;
            case "VarDecl": traverseExpr(stmt.expr, env); break;
            case "Return": traverseExpr(stmt.expr, env); break;
            case "Break": case "Continue": break;
            default: assertUnreachable(stmt);
        }
    }

    export function traverseStmts(stmts:AST.Stmt[], env:SymbolTable<string>) {
        env = collectFnDecl(stmts, env);
        for (let s of stmts) {traverseStmt(s, env);}
    }

    export function traverse(stmts:AST.Stmt[]) {traverseStmts(stmts, new SymbolTable(undefined));}
}

export { FunctionRenamer }

