import type { AST } from "./ast";
import { assertUnreachable, createLabel, createReg, throwError } from "./helper";
import { IR } from "./ir";
import { JumpContext } from "./jmp-context";
import { SymbolTable } from "./symbol-table";
import { TokenType } from "./token-type";
import { Arth, Type } from "./type";

function translateExpr (expr:AST.Expr, env:SymbolTable<[string,Type.Type]>) : [string, IR.Instr[], Arth.Type] {
    switch(expr.kind) {
        case "Const": {
            if (typeof expr.value === "number") {
                const r = createReg();
                return [r, [IR.Set(r, IR.Imm(expr.value))], Type.Int]
            }
            else {
                let value = 0;
                if (expr.value) {value = 1;}
                const r = createReg();
                return [r, [IR.Set(r, IR.Imm(value))], Type.Bool]
            }
        }
        case "Var": {
            const [xp,type] = env.lookup(expr.name)!;
            const r = createReg();
            const arth = Type.toArth(type);
            switch (type.kind) {
                case "Ptr": 
                case "Int": return [r, [IR.LoadWord(r, xp)], arth]
                case "Bool": return [r, [IR.LoadByte(r, xp)], arth]
                case "Func": throwError(expr.lineNum, `Typecheck fail: Invalid generation of ${Type.stringOfType(type)}. You mustn't be here`)
                default: assertUnreachable(type)
            }
        }
        case "AddrOf": {
            const [xp,type] = env.lookup(expr.operand)!;
            const r = createReg();
            const arth = Type.toArth(type);
            return [r, [IR.Set(r, IR.Reg(xp))], Arth.Ptr(arth)];
        }
        case "Deref": {
            const [t1, code, arth] = translateExpr(expr.operand, env);
            const r = createReg();
            if (Type.isEqual(arth, Type.Ptr(Type.Int))) {return [r, [...code, IR.LoadWord(r, t1)], Arth.Int];}
            if (Type.isEqual(arth, Type.Ptr(Type.Bool))) {return [r, [...code, IR.LoadByte(r, t1)], Arth.Bool];}
            if (arth.kind === "Ptr") {return [r, [...code, ...[IR.LoadWord(r, t1)]], arth.inner];}
            throwError(expr.lineNum, `Typecheck fail: Invalid derefernce of ${Type.stringOfType(arth)}. You mustn't be here`);
        }
        case "PtrUpdate": {
            const [t1, code1, arth1] = translateExpr(expr.left, env);
            const [t2, code2, arth2] = translateExpr(expr.right, env);
            const r = createReg();
            let storeInstr;
            if (Type.isEqual(arth1, Arth.Ptr(Type.Int))) {storeInstr = IR.StoreWord(IR.Reg(t2), t1);}
            else if (Type.isEqual(arth1, Arth.Ptr(Type.Bool))) {storeInstr = IR.StoreByte(IR.Reg(t2), t1);}
            else if (arth1.kind === "Ptr") {storeInstr = IR.StoreWord(IR.Reg(t2), t1);}
            else {throwError(expr.lineNum, `Typecheck fail: Invalid ptr update of ${Type.stringOfType(arth1)}. You mustn't be here`);}
            return [r, [...code1, ...code2, storeInstr, IR.Set(r,IR.Reg(t2))], arth2]
        }
        case "Assign": {
            const [t1, code1, arth] = translateExpr(expr.expr, env);
            const r = createReg();
            const [xp,type] = env.lookup(expr.name)!;
            switch (type.kind) {
                case "Bool": return [r, [...code1,IR.StoreByte(IR.Reg(t1), xp),IR.Set(r,IR.Reg(t1))], arth];
                case "Int":
                case "Ptr": return [r, [...code1,IR.StoreWord(IR.Reg(t1), xp),IR.Set(r,IR.Reg(t1))], arth];
            }
            throwError(expr.lineNum, `Typecheck fail: Invalid assignment translation of ${Type.stringOfType(type)}. You mustn't be here`);
        }
        case "BinOp": {
            const [t1, code1, arth1] = translateExpr(expr.left, env);
            const [t2, code2, arth2] = translateExpr(expr.right, env);
            const r = createReg();
            switch (expr.op) {
                case TokenType.Plus: {
                    if (Arth.isEqual(arth1, arth2) && Arth.isEqual(arth1, Type.Int)) 
                        {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Add, IR.Reg(t1), IR.Reg(t2))], arth1];}

                    if (arth1.kind === "Ptr" && arth2.kind === "Int") {
                        if (arth1.inner.kind === "Bool") 
                            {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Add, IR.Reg(t1), IR.Reg(t2))], arth1];}

                        const t3 = createReg();
                        return [r, [...code1, 
                                    ...code2,
                                    IR.BinOp(t3, IR.BinOperator.Mul, IR.Reg(t2), IR.Imm(4)),
                                    IR.BinOp(r, IR.BinOperator.Add, IR.Reg(t1), IR.Reg(t3))],
                                arth1];
                    }
                    if (arth2.kind === "Ptr" && arth1.kind === "Int") {
                        if (arth2.inner.kind === "Bool")
                            {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Add, IR.Reg(t1), IR.Reg(t2))], arth2];}

                        const t3 = createReg();
                        return [r, [...code1, 
                                    ...code2,
                                    IR.BinOp(t3, IR.BinOperator.Mul, IR.Reg(t1), IR.Imm(4)),
                                    IR.BinOp(r, IR.BinOperator.Add, IR.Reg(t2), IR.Reg(t3))],
                                arth2];
                    }
                    throwError(expr.lineNum, `Typecheck fail: Invalid Add operation of ${Type.stringOfType(arth1)} and ${Type.stringOfType(arth2)}`)
                }
                case TokenType.Minus: {
                    if (Arth.isEqual(arth1, arth2) && Arth.isEqual(arth1, Type.Int))
                        {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Sub, IR.Reg(t1), IR.Reg(t2))], arth1];}

                    if (arth1.kind === "Ptr" && arth2.kind === "Int") {
                        if (arth1.inner.kind === "Bool")
                            {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Sub, IR.Reg(t1), IR.Reg(t2))], arth1];}

                        const t3 = createReg();
                        return [r, [...code1, 
                                    ...code2,
                                    IR.BinOp(t3, IR.BinOperator.Mul, IR.Reg(t2), IR.Imm(4)),
                                    IR.BinOp(r, IR.BinOperator.Sub, IR.Reg(t1), IR.Reg(t3))],
                                arth1];
                    }
                    if (Arth.isEqual(arth1, arth2) && arth1.kind === "Ptr") {
                        if (arth1.inner.kind === "Bool") 
                            {return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Sub, IR.Reg(t1), IR.Reg(t2))], Arth.Int];}
                        const t3 = createReg();
                        return [r, [...code1, 
                                    ...code2,
                                    IR.BinOp(t3, IR.BinOperator.Sub, IR.Reg(t1), IR.Reg(t2)),
                                    IR.BinOp(r, IR.BinOperator.Div, IR.Reg(t3), IR.Imm(4))], 
                                Arth.Int]
                    }
                    throwError(expr.lineNum, `Typecheck fail: Invalid Sub operation of ${Type.stringOfType(arth1)} and ${Type.stringOfType(arth2)}`)
                }
                case TokenType.Star: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Mul, IR.Reg(t1), IR.Reg(t2))], Arth.Int];
                case TokenType.Slash: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Div, IR.Reg(t1), IR.Reg(t2))], Arth.Int];
                case TokenType.Less: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Lt, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.LessEqual: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Leq, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.Greater: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Gt, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.GreaterEqual: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Geq, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.EqualEqual: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Eq, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.BangEqual: return [r, [...code1, ...code2, IR.BinOp(r, IR.BinOperator.Neq, IR.Reg(t1), IR.Reg(t2))], Arth.Bool];
                case TokenType.VertBarVertBar: {
                    const l1 = createLabel();
                    const l2 = createLabel();
                    return [r, [...code1,
                                IR.GotoT(IR.Reg(t1), l1),
                                ...code2,
                                IR.Set(r, IR.Reg(t2)),
                                IR.Goto(l2),
                                IR.Label(l1),
                                IR.Set(r, IR.Imm(1)),
                                IR.Label(l2)
                            ], Arth.Bool];
                }
                case TokenType.AmpAmp: {
                    const l1 = createLabel();
                    const l2 = createLabel();
                    return [r, [...code1,
                                IR.GotoF(IR.Reg(t1), l1),
                                ...code2,
                                IR.Set(r, IR.Reg(t2)),
                                IR.Goto(l2),
                                IR.Label(l1),
                                IR.Set(r, IR.Imm(0)),
                                IR.Label(l2)
                            ], Arth.Bool];
                }
                default: throwError(expr.lineNum, `Typecheck fail: Tried to generate IR of invalid binary operator ${expr.op}`);
            }
        }
        case "UnOp": {
            const [t1, code, arth] = translateExpr(expr.operand, env);
            const r = createReg();
            switch (expr.op) {
                case TokenType.Minus: return [r, [...code, IR.UnOp(r, IR.UnOperator.Neg, IR.Reg(t1))], Arth.Int];
                case TokenType.Plus: return [r, [...code, IR.UnOp(r, IR.UnOperator.UPlus, IR.Reg(t1))], Arth.Int];
                case TokenType.Bang: return [r, [...code, IR.UnOp(r, IR.UnOperator.Not, IR.Reg(t1))], Arth.Bool];
                case TokenType.Alloc: return [r, [...code, IR.Alloc(r, IR.Reg(t1))], Arth.Ptr(Arth.Bool)];
                case TokenType.Print: return [r, [...code, IR.Print(r, IR.Reg(t1))], arth];
                default:throwError(expr.lineNum, `Typecheck fail: Tried to generate IR of invalid unary operator ${expr.op}`);
            }
        }
        case "Cast": {
            const [t1, code, _] = translateExpr(expr.left, env);
            return [t1, [...code], Type.toArth(expr.type)]
        }
        case "Call": {
            if (expr.returnType === undefined) {throwError(expr.lineNum, `Typecheck fail: return type of call not updated.`);}
            let regs: IR.Operand[] = []
            let code: IR.Instr[] = []
            for (const e of expr.args) {
                const [t1, code1, _] = translateExpr(e, env);
                code = [...code, ...code1]
                regs.push(IR.Reg(t1));
            }
            const r = createReg();
            code = [...code, IR.Call(r, expr.calleeName, regs)]
            return [r, code, Type.toArth(expr.returnType)]
        }
        default: assertUnreachable(expr);
    }
}

function sizeOfType (t:Type.Type) {
    switch (t.kind) {
        case "Bool": return 1;
        case "Int": return 4;
        case "Ptr": return 4;
        case "Func": throwError(0, `Cannot get size of ${Type.stringOfType(t)}`);
        default: assertUnreachable(t);
    }
}

function translateStmt (stmt:AST.Stmt, env:SymbolTable<[string,Type.Type]>, jmpCtx:JumpContext) : IR.Instr[] {
    switch (stmt.kind) {
        case "VarDecl": {
            const [t1, code1, _] = translateExpr(stmt.expr, env);
            const r = createReg();
            const name = stmt.ntp.name;
            const type = stmt.ntp.type;
            const size = sizeOfType(type);
            env.define(name, [r, type])
            if (size === 4) {return [...code1, IR.Alloc(r, IR.Imm(size)), IR.StoreWord(IR.Reg(t1), r)];}
            else {return [...code1, IR.Alloc(r, IR.Imm(size)), IR.StoreByte(IR.Reg(t1), r)];}
        }
        case "Return": {
            const [t1, code1, _] = translateExpr(stmt.expr, env);
            return [...code1, IR.Ret(IR.Reg(t1))];
        }
        case "ExprStmt": {
            const [_, code1, __] = translateExpr(stmt.expr, env);
            return code1;
        }
        case "If": {
            const [t1, code1, _] = translateExpr(stmt.cond, env);
            const codeTEnv = new SymbolTable(env);
            const codeT = translateStmt(stmt.true_arm, codeTEnv, jmpCtx);
            const codeFEnv = new SymbolTable(env);
            const codeF = translateStmt(stmt.false_arm, codeFEnv, jmpCtx);
            const l1 = createLabel();
            const lx = createLabel();
            return [...code1, 
                    IR.GotoF(IR.Reg(t1), l1),
                    ...codeT,
                    IR.Goto(lx),
                    IR.Label(l1),
                    ...codeF,
                    IR.Label(lx)]
        }
        case "While": {
            const [tc, codeC, _] = translateExpr(stmt.cond, env);
            
            const lc = createLabel();
            const lx = createLabel();
            const newJmpCtx = new JumpContext(jmpCtx);
            newJmpCtx.defineCondLabel(lc);
            newJmpCtx.defineExitLabel(lx);

            const codeBEnv = new SymbolTable(env);
            const codeB = translateStmt(stmt.body, codeBEnv, newJmpCtx);
            return [IR.Label(lc), 
                    ...codeC,
                    IR.GotoF(IR.Reg(tc), lx),
                    ...codeB,
                    IR.Goto(lc),
                    IR.Label(lx)]
        }
        case "Block": {
            const codeBEnv = new SymbolTable(env);
            return translateStmts(stmt.stmts, codeBEnv, jmpCtx);
        }
        case "FnDecl": {
            const codeBEnv = new SymbolTable(env);
            let prologue:IR.Instr[] = []
            for (const ntp of stmt.args) {
                const r = createReg();
                const size = sizeOfType(ntp.type);
                const allocInstr = IR.Alloc(r, IR.Imm(size));
                if (size === 4) {prologue = [...prologue, allocInstr, IR.StoreWord(IR.Reg(ntp.name), r)];}
                else {prologue = [...prologue, allocInstr, IR.StoreByte(IR.Reg(ntp.name), r)];}
                codeBEnv.define(ntp.name, [r, ntp.type]);
            }
            const emptyJmpCtx = new JumpContext(undefined);
            const codeB = [...prologue, ...translateStmt(stmt.body, codeBEnv, emptyJmpCtx)];
            const formalArgs = stmt.args.map((ntp) => {return ntp.name;});
            return [IR.FnDecl(stmt.name, formalArgs, codeB)];
        }
        case "Break": {
            const lx = jmpCtx.getExitLabel();
            if (lx === undefined) {throwError(stmt.lineNum, `Break statement is not part of a while loop.`);}
            return [IR.Goto(lx)];
        }
        case "Continue": {
            const lc = jmpCtx.getCondLabel();
            if (lc === undefined) {throwError(stmt.lineNum, `Continue statement is not part of a while loop.`);}
            return [IR.Goto(lc)];
        }
        default: assertUnreachable(stmt);
    }
}

function translateStmts(stmts:AST.Stmt[], env:SymbolTable<[string,Type.Type]>, jmpCtx:JumpContext) : IR.Instr[] {
    let code: IR.Instr[] = [];
    for (const s of stmts) {
        code = [...code, ...translateStmt(s, env, jmpCtx)]
    }
    return code;
}

function translate(stmts:AST.Stmt[]) : IR.Instr[] {
    const code = translateStmts(stmts, new SymbolTable(undefined), new JumpContext(undefined));
    return [...code, IR.Halt];
}

export { translate }