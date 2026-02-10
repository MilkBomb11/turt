import type { AST } from "./ast";
import { assertUnreachable, throwError } from "./helper";

namespace ReturnChecker {
    export function check (stmts:AST.Stmt[]) {traverseStmts(stmts);}

    function traverseStmts (stmts: AST.Stmt[]) {
        for (const s of stmts) 
        {traverseStmt(s);}
    }

    function traverseStmt (stmt: AST.Stmt) {
        switch (stmt.kind) {
            case "If": {
                traverseStmt(stmt.true_arm);
                traverseStmt(stmt.false_arm);
                break;
            }
            case "While": traverseStmt(stmt.body); break;
            case "Block": traverseStmts(stmt.stmts); break;
            case "FnDecl": {
                if (!checkReturnPath(stmt.body)) {throwError(stmt.lineNum, `Function ${stmt.name} might not return.`);}
                traverseStmt(stmt.body); break;
            }
            case "Break": case "Continue": case "ExprStmt": case "VarDecl": case "Return": break;
            default: assertUnreachable(stmt);
        }
    }

    function checkReturnPath(stmt: AST.Stmt) : boolean {
        switch (stmt.kind) {
            case "Return" : return true;
            case "If": return checkReturnPath(stmt.true_arm) && checkReturnPath(stmt.false_arm);
            case "While": {
                if (stmt.cond.kind === "Const" && stmt.cond.value === true) {return checkReturnPath(stmt.body);}
                return false;
            }
            case "Block": {
                for (const s of stmt.stmts) {
                    if (checkReturnPath(s)) 
                    {return true;}
                }
                return false;
            }
            case "Break": 
            case "Continue":
            case "ExprStmt":
            case "VarDecl":
            case "FnDecl": return false;
            default: return false;
        }
    }
}

export { ReturnChecker }