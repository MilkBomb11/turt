import type { AST } from "./ast";
import { assertUnreachable, throwError } from "./helper";
import { SymbolTable } from "./symbol-table";
import { TokenType } from "./token-type";
import { Type } from "./type";

function collectFnDecl (stmts:AST.Stmt[], env:SymbolTable<Type.Type>) : SymbolTable<Type.Type> {
    for (const s of stmts) {
        if (s.kind === "FnDecl") {
            const name = s.name;
            const argTypes = s.args.map((ntp) => {return ntp.type});
            if (env.lookupCurrentScope(name) !== undefined) {throwError(s.lineNum, `Redeclaration of function ${name}`);}
            env.define(name, Type.Func(argTypes, s.returnType));
        }
    }
    return env;
}

function typeCheckStmts (stmts:AST.Stmt[], returnType:Type.Type | undefined, env:SymbolTable<Type.Type>) : void {
    env = collectFnDecl(stmts, env);
    for (const s of stmts) {typeCheckStmt(s, returnType, env);}
}


function typeCheckStmt (stmt:AST.Stmt, returnType:Type.Type | undefined, env:SymbolTable<Type.Type>) : void {
    switch (stmt.kind) {
        case "Return": {
            const exprType = typeCheckExpr(stmt.expr, env);
            if (returnType === undefined) {throwError(stmt.lineNum, `Return statement does not belong to any function`);}
            if (!Type.isEqual(exprType, returnType)) {throwError(stmt.lineNum, `Expected ${Type.stringOfType(returnType)} as return type but got ${Type.stringOfType(exprType)}`);}
            break;
        }
        case "VarDecl" : {
            const exprType = typeCheckExpr(stmt.expr, env);
            const name = stmt.ntp.name;
            if (env.lookupCurrentScope(name) !== undefined) {throwError(stmt.lineNum, `Redeclaration of ${name}`)}
            const type = stmt.ntp.type;
            if (!Type.isEqual(exprType, type)) {throwError(stmt.lineNum, `Variable ${name} was declared as ${Type.stringOfType(type)} but is assigned ${Type.stringOfType(exprType)}`)}
            env.define(name, exprType);
            break;
        }
        case "Block": {
            let blockEnv = new SymbolTable<Type.Type>(env);
            typeCheckStmts(stmt.stmts, returnType, blockEnv);
            break;
        }
        case "FnDecl": {
            const argTypes = stmt.args.map((ntp) => {return ntp.type});
            const bodyEnv = new SymbolTable<Type.Type>(env);
            bodyEnv.define(stmt.name, Type.Func(argTypes, stmt.returnType));
            for (const ntp of stmt.args) {
                if (bodyEnv.lookupCurrentScope(ntp.name) !== undefined) {throwError(stmt.lineNum, `Redeclartion of parameter ${ntp.name} of ${stmt.name}.`);}
                bodyEnv.define(ntp.name, ntp.type);
            }
            typeCheckStmt(stmt.body, stmt.returnType, bodyEnv);
            break;
        }
        case "If": {
            const condType = typeCheckExpr(stmt.cond, env);
            if (condType.kind !== "Bool") {throwError(stmt.lineNum, `Expected value of type Bool for condition of if statement`);}
            const trueArmEnv = new SymbolTable<Type.Type>(env);
            typeCheckStmt(stmt.true_arm, returnType, trueArmEnv);
            const falseArmEnv = new SymbolTable<Type.Type>(env);
            typeCheckStmt(stmt.false_arm, returnType, falseArmEnv); 
            break;
        }
        case "While": {
            const condType = typeCheckExpr(stmt.cond, env);
            if (condType.kind !== "Bool") {throwError(stmt.lineNum, `Expected value of type Bool for condition of while statement`);}
            const bodyEnv = new SymbolTable<Type.Type>(env);
            typeCheckStmt(stmt.body, returnType, bodyEnv);
            break;
        }
        case "ExprStmt": typeCheckExpr(stmt.expr, env); break;
        case "Break": case "Continue": break;
        default: assertUnreachable(stmt);
    }
}

function typeCheckExpr (expr:AST.Expr, env:SymbolTable<Type.Type>) : Type.Type {
    switch (expr.kind) {
        case "Cast": {
            if (expr.left.kind === "Var") {
                const t = env.lookup(expr.left.name);
                if (t === undefined) {throwError(expr.lineNum, `Tried to cast undeclared variable ${expr.left.name}`)}
                if (t.kind === "Func") {throwError(expr.lineNum, `Cannot cast value of type ${Type.stringOfType(t)}`)}
            }
            return expr.type;
        }
        case "Const": {
            if (typeof expr.value === "number") {return Type.Int;}
            else if (typeof expr.value === "boolean") {return Type.Bool;}
            else {throwError(expr.lineNum,`Type of constant ${expr.value} is unknown`);}
        }
        case "Var": {
            let type = env.lookup(expr.name);
            if (type === undefined) {throwError(expr.lineNum, `Use of undeclared variable ${expr.name}`);}
            return type;
        }
        case "AddrOf": {
            let operandType = env.lookup(expr.operand);
            if (operandType === undefined) {throwError(expr.lineNum, `Use of undeclared variable ${expr.operand}`);}
            return Type.Ptr(operandType);
        }
        case "Deref": {
            let operandType = typeCheckExpr(expr.operand, env);
            if (operandType.kind === "Ptr") {return operandType.inner;}
            else {throwError(expr.lineNum, `Cannot dereference a ${Type.stringOfType(operandType)}`);}
        }
        case "PtrUpdate": {
            let leftType = typeCheckExpr(expr.left, env);
            let rightType = typeCheckExpr(expr.right, env);
            if (leftType.kind === "Ptr") {
                if (Type.isEqual(leftType.inner, rightType)) {return rightType;}
                else {throwError(expr.lineNum, `Types of ${Type.stringOfType(leftType.inner)} and ${Type.stringOfType(rightType)} do not match`);}
            }
            throwError(expr.lineNum, `Cannot perform ptr update on non ptr type ${Type.stringOfType(leftType)}`);
        }
        case "Assign": {
            let leftType = env.lookup(expr.name);
            if (leftType === undefined) {throwError(expr.lineNum,`Use of undeclared variable ${expr.name}`);}
            let rightType = typeCheckExpr(expr.expr, env);
            if (Type.isEqual(leftType, rightType)) {return leftType;}
            else {throwError(expr.lineNum, `Types of ${Type.stringOfType(leftType)} and ${Type.stringOfType(rightType)} do not match`);}
        }
        case "Call": {
            const calleeType = env.lookup(expr.calleeName);
            if (calleeType === undefined) {throwError(expr.lineNum, `Use of undeclared variable ${expr.calleeName}`);}
            if (calleeType.kind !== "Func") {throwError(expr.lineNum, `Tried to call ${expr.calleeName} when it is not a function`);}

            const argTypes = expr.args.map((e) => {return typeCheckExpr(e, env);})
            const formalArgTypes = calleeType.args;
            if (argTypes.length !== formalArgTypes.length) {
                throwError(expr.lineNum, `Mismatched number of arguments for ${expr.calleeName} with its definition`)
            }

            for (let i = 0; i < argTypes.length; i++) {
                const argType = argTypes[i];
                const formalArgType = formalArgTypes[i];
                if (!Type.isEqual(argType, formalArgType)) 
                {throwError(expr.lineNum, `Mismatched argument types for argument ${i+1} of ${expr.calleeName}. ` +
                                 `Expected a ${Type.stringOfType(formalArgType)} but got a ${Type.stringOfType(argType)}`)}
            }
            const returnType = calleeType.returnType;
            expr.returnType = calleeType.returnType;
            return returnType;
        }
        case "UnOp": {
            const operandType = typeCheckExpr(expr.operand, env);
            switch (expr.op) {
                case TokenType.Minus: {
                    if (operandType.kind === "Int") {return Type.Int;}
                    throwError(expr.lineNum, `Expected Int for operator ${expr.op}`);
                }
                case TokenType.Plus: {
                    if (operandType.kind === "Int") {return Type.Int;}
                    throwError(expr.lineNum, `Expected Int for operator ${expr.op}`);
                }
                case TokenType.Bang: {
                    if (operandType.kind === "Bool") {return Type.Bool;}
                    throwError(expr.lineNum, `Expected Bool for operator ${expr.op}`);
                }
                case TokenType.Alloc: {
                    if (operandType.kind !== "Int") {throwError(expr.lineNum, `Expected Int for operator ${expr.op}`)}
                    return Type.Ptr(Type.Bool);
                }
            }
            throwError(expr.lineNum, `Invalid unary operator ${expr.op}`);
        }
        case "BinOp": {
            const leftType = typeCheckExpr(expr.left, env);
            const rightType = typeCheckExpr(expr.right, env);
            switch (expr.op) {
                case TokenType.Plus: {
                    if (Type.isEqual(leftType, rightType)) {
                        if (leftType.kind === "Int") {return Type.Int;}
                        throwError(expr.lineNum, `Operator ${expr.op} doesn't allow ${Type.stringOfType(leftType)} + ${Type.stringOfType(rightType)}`);
                    }
                    if (leftType.kind === "Ptr" && rightType.kind === "Int") {return leftType;}
                    if (leftType.kind === "Int" && rightType.kind === "Ptr") {return rightType;}
                    throwError(expr.lineNum, `Operator ${expr.op} doesn't allow ${Type.stringOfType(leftType)} + ${Type.stringOfType(rightType)}`);
                }
                case TokenType.Minus: {
                    if (Type.isEqual(leftType, rightType)) {
                        if (leftType.kind === "Int" || leftType.kind === "Ptr") {return Type.Int;}
                        throwError(expr.lineNum, `Operator ${expr.op} doesn't allow ${Type.stringOfType(leftType)} - ${Type.stringOfType(rightType)}`);
                    }
                    if (leftType.kind === "Ptr" && rightType.kind === "Int") {return leftType;}
                    throwError(expr.lineNum, `Operator ${expr.op} doesn't allow ${Type.stringOfType(leftType)} - ${Type.stringOfType(rightType)}`);
                }
                case TokenType.Star:
                case TokenType.Slash: {
                    if (!Type.isEqual(leftType, rightType)) {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of same type`);}
                    if (leftType.kind !== "Int") {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of type Int`)}
                    return leftType;
                }
                case TokenType.Less:
                case TokenType.LessEqual:
                case TokenType.Greater:
                case TokenType.GreaterEqual: {
                    if (!Type.isEqual(leftType, rightType)) {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of same type`);}
                    if (leftType.kind !== "Int" && leftType.kind !== "Ptr") {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of type Int or Ptr`)} 
                    return Type.Bool;
                }
                case TokenType.EqualEqual:
                case TokenType.BangEqual: {
                    if (!Type.isEqual(leftType, rightType)) {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of same type`);}
                    if (leftType.kind === "Func") {throwError(expr.lineNum, `Function comparison is forbidden`)}
                    return Type.Bool;
                }
                case TokenType.VertBarVertBar:
                case TokenType.AmpAmp: {
                    if (!Type.isEqual(leftType, rightType)) {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of same type`);}
                    if (leftType.kind !== "Bool") {throwError(expr.lineNum, `Operator ${expr.op} only allows operands of type Bool`)} 
                    return Type.Bool;
                }
            }
            throwError(expr.lineNum, `Invalid binary operator ${expr.op}`);
        }
        default: assertUnreachable(expr);
    }
}

export { typeCheckStmts }
