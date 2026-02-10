import type { TokenType } from "./token-type";
import { assertUnreachable } from "./helper";
import { Type, NameTypePair } from "./type";

namespace AST {
    interface If {
        kind: "If";
        lineNum: number;
        cond: Expr;
        true_arm: Stmt;
        false_arm: Stmt;
    }
    export const If = 
        (lineNum:number, cond:Expr, true_arm:Stmt, false_arm:Stmt) => 
            {return {kind:"If" as const, lineNum:lineNum, cond:cond, true_arm:true_arm, false_arm:false_arm};}

    interface While {
        kind: "While";
        lineNum: number;
        cond: Expr;
        body: Stmt;
    }
    export const While =
        (lineNum:number, cond:Expr, body:Stmt) => {return {kind:"While" as const, lineNum:lineNum, cond:cond, body:body};}

    interface FnDecl {
        kind: "FnDecl";
        lineNum:number;
        name: string;
        args: NameTypePair[];
        returnType: Type.Type;
        body: Stmt;
    }
    export const FnDecl =
        (lineNum:number, name:string, args:NameTypePair[], body:Stmt, returnType:Type.Type) => 
            {return {kind:"FnDecl" as const, lineNum:lineNum, name:name, args:args,  returnType:returnType, body:body};}
    
    interface Block {
        kind: "Block";
        lineNum:number;
        stmts: Stmt[];
    }
    export const Block =
        (lineNum:number, stmts:Stmt[]) => {return {kind:"Block" as const, lineNum:lineNum, stmts:stmts};}
    
    interface VarDecl {
        kind: "VarDecl";
        lineNum:number;
        ntp: NameTypePair;
        expr: Expr;
    }
    export const VarDecl =
        (lineNum:number, ntp:NameTypePair, expr:Expr) => {return {kind:"VarDecl" as const, lineNum:lineNum, ntp:ntp, expr:expr};}

    interface PtrUpdate {
        kind: "PtrUpdate";
        lineNum:number;
        left: Expr;
        right: Expr; 
    }
    export const PtrUpdate =
        (lineNum:number, left:Expr, right:Expr) => {return {kind:"PtrUpdate" as const, lineNum:lineNum, left:left, right:right};}

    interface Return {
        kind: "Return";
        lineNum:number;
        expr: Expr;
    }
    export const Return =
        (lineNum:number, expr:Expr) => {return {kind:"Return" as const, lineNum:lineNum, expr:expr};}
    
    interface ExprStmt {
        kind: "ExprStmt";
        lineNum:number;
        expr: Expr;
    }
    export const ExprStmt =
        (lineNum:number, expr:Expr) => {return {kind:"ExprStmt" as const, lineNum:lineNum, expr:expr};}

    interface Break {
        kind: "Break";
        lineNum: number;
    }
    export const Break =
        (lineNum:number) => {return {kind:"Break" as const, lineNum:lineNum}};

    interface Continue {
        kind: "Continue";
        lineNum: number;
    }
    export const Continue =
        (lineNum:number) => {return {kind:"Continue" as const, lineNum:lineNum};};

    interface Const {
        kind: "Const";
        lineNum:number;
        value: boolean | number;
    }
    export const Const = (lineNum:number, value:boolean | number) => {return {kind:"Const" as const, lineNum:lineNum, value:value};}

    interface Var {
        kind: "Var";
        lineNum:number;
        name: string;
    }
    export const Var = (lineNum:number, name:string) => {return {kind:"Var" as const, lineNum:lineNum, name:name};}

    interface Assign {
        kind: "Assign";
        lineNum:number;
        name: string;
        expr: Expr;
    }
    export const Assign = (lineNum:number, name:string, expr:Expr) => {return {kind:"Assign" as const, lineNum:lineNum, name:name, expr:expr};}

    interface BinOp {
        kind: "BinOp";
        lineNum:number;
        left: Expr;
        op: TokenType;
        right: Expr;
    }
    export const BinOp = (lineNum:number, left:Expr, op:TokenType, right:Expr) => {return {kind:"BinOp" as const, lineNum:lineNum, left:left, op:op, right:right};}

    interface UnOp {
        kind: "UnOp";
        lineNum:number;
        op: TokenType;
        operand: Expr;
    }
    export const UnOp = (lineNum:number, op:TokenType, operand:Expr) => {return {kind:"UnOp" as const, lineNum:lineNum, op:op, operand:operand};}

    interface Cast {
        kind: "Cast";
        lineNum:number;
        left: Expr;
        type: Type.Type; 
    }
    export const Cast = (lineNum:number, left:Expr, type:Type.Type) => {return {kind:"Cast" as const, lineNum:lineNum, left:left, type:type};}

    interface AddrOf {
        kind: "AddrOf";
        lineNum:number;
        operand: string;
    }
    export const AddrOf = (lineNum:number, operand:string) => {return {kind: "AddrOf" as const, lineNum:lineNum, operand:operand};}

    interface Deref {
        kind: "Deref";
        lineNum:number;
        operand: Expr;
    }
    export const Deref = (lineNum:number, operand:Expr) => {return {kind: "Deref" as const, lineNum:lineNum, operand:operand};}

    interface Call {
        kind: "Call";
        lineNum:number;
        calleeName: string;
        args: Expr[];
        returnType?: Type.Type
    }
    export const Call = (lineNum:number, calleeName:string, args:Expr[], returnType?:Type.Type) => 
        {return {kind:"Call" as const, lineNum:lineNum, calleeName:calleeName, args:args, returnType:returnType};}

    export type Expr = BinOp | Assign | PtrUpdate | UnOp | AddrOf |Deref | Call | Var | Const | Cast
    export type Stmt = FnDecl | If | While | Block | Return | Break | Continue | ExprStmt | VarDecl
}

namespace AST {
    export function stringOfExpr (expr:AST.Expr) : string {
        switch (expr.kind) {
            case "Const": return `Const(${expr.value.toString()})`;
            case "Var": return `Var(${expr.name})`;
            case "BinOp": return `BinOp(${stringOfExpr(expr.left)}, ${expr.op}, ${stringOfExpr(expr.right)})`;
            case "UnOp": return `UnOp(${expr.op}, ${stringOfExpr(expr.operand)})`;
            case "Deref": return `Deref(${stringOfExpr(expr.operand)})`
            case "PtrUpdate": return `PtrUpdate(${stringOfExpr(expr.left)}, ${stringOfExpr(expr.right)})`
            case "AddrOf": return `AddrOf(${expr.operand})`
            case "Assign": return `Assign(${expr.name}, ${stringOfExpr(expr.expr)})`;
            case "Cast" : return `Cast(${stringOfExpr(expr.left)}, ${Type.stringOfType(expr.type)})`
            case "Call": {
                let col: string[] = expr.args.map(stringOfExpr);
                if (expr.returnType === undefined) {return `Call(${expr.calleeName}, ${col.join('\n')}, undefined)`;}
                return `Call(${expr.calleeName}, ${col.join('\n')}, ${Type.stringOfType(expr.returnType)})`;
            } 
            default: assertUnreachable(expr);
        }
    }

    function stringOfStmt (stmt:AST.Stmt) : string {
        switch (stmt.kind) {
            case "Break": return `Break`
            case "Continue": return `Continue`
            case "Return": return `Return(${stringOfExpr(stmt.expr)})`
            case "ExprStmt": return `ExprStmt(${stringOfExpr(stmt.expr)})`
            case "FnDecl": {
                let args = stmt.args.map(Type.stringOfNameTypePair).join(',');
                return `FnDecl(${stmt.name}, [${args}] -> ${Type.stringOfType(stmt.returnType)}, ${stringOfStmt(stmt.body)})`
            }
            case "If": {
                return `If(${stringOfExpr(stmt.cond)}, ${stringOfStmt(stmt.true_arm)}, ${stringOfStmt(stmt.false_arm)})`;
            }   
            case "While": {
                return `While(${stringOfExpr(stmt.cond)}, ${stringOfStmt(stmt.body)})`;
            }
            case "VarDecl": {
                let expr = stringOfExpr(stmt.expr);
                return `Let(${Type.stringOfNameTypePair(stmt.ntp)}, ${expr})`
            }
            case "Block": {
                let stmts = stringOfStmts(stmt.stmts);
                return `Block(${stmts})`;
            }
            default: assertUnreachable(stmt);
        }
    }

    export function stringOfStmts (stmts:AST.Stmt[]): string {
        return stmts.map(stringOfStmt).join("\n");
    }
}

export { AST }


