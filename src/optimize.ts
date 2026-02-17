import { LVAnalysis } from "./live-variable-analysis";
import { IR } from "./ir";
import { cloneDeep, isEqual } from "lodash-es"
import { CPAnalysis } from "./constant-propagation-analysis";

namespace Mem2Reg {
    function getAllAllocDests(instrs:IR.Instr[]) : Set<string> {
        const regs:Set<string> = new Set();
        instrs
        .filter((instr) => { return instr.kind === "Alloc";})
        .map((instr) => {return instr.dest})
        .forEach((reg) => {regs.add(reg);})
        return regs;
    }

    function getAllPromotableRegs (instrs:IR.Instr[]) : Set<string> {
        const regs = getAllAllocDests(instrs);
        for (const instr of instrs) {
            switch (instr.kind) {
                case "Alloc": {
                    if (instr.operand.kind === "Reg") {regs.delete(instr.operand.name);}
                    break;
                }
                case "Set": {
                    if (instr.right.kind === "Reg") {regs.delete(instr.right.name);}
                    break;
                }
                case "BinOp": {
                    if (instr.right1.kind === "Reg") {regs.delete(instr.right1.name);}
                    if (instr.right2.kind === "Reg") {regs.delete(instr.right2.name);}
                    break;
                }
                case "UnOp": {
                    if (instr.right.kind === "Reg") {regs.delete(instr.right.name);}
                    break;
                }
                case "Call": {
                    for (const arg of instr.args) {
                        if (arg.kind === "Reg") 
                        {regs.delete(arg.name);}
                    }
                    break;
                }
                case "GotoT":
                case "GotoF": {
                    if (instr.cond.kind === "Reg") {regs.delete(instr.cond.name);}
                    break;
                }
                case "Ret": {
                    if (instr.operand.kind === "Reg") {regs.delete(instr.operand.name);}
                    break;
                }
                case "Print": {
                    if (instr.operand.kind === "Reg") {regs.delete(instr.operand.name);}
                    break;
                }
                case "LoadByte":
                case "LoadWord": {
                    if (regs.has(instr.dest)) { regs.delete(instr.dest); }
                    break;
                }
                case "StoreByte":
                case "StoreWord": {
                    if (instr.src.kind === "Reg") {regs.delete(instr.src.name);}
                    break;
                }
            }
        }
        return regs;
    }

    export function mem2Reg(instrs:IR.Instr[]) : IR.Instr[] {
        const promotables = getAllPromotableRegs(instrs);
        const newInstrs:IR.Instr[] = [];
        for (const instr of instrs) {
            switch (instr.kind) {
                case "Alloc": {
                    if (promotables.has(instr.dest)) {break;}
                    newInstrs.push(instr); break;
                }
                case "StoreByte":
                case "StoreWord": {
                    if (promotables.has(instr.dest)) { newInstrs.push(IR.Set(instr.dest, instr.src)); break;}
                    newInstrs.push(instr); break;
                }
                case "LoadByte":
                case "LoadWord": {
                    if (promotables.has(instr.src)) {newInstrs.push(IR.Set(instr.dest, IR.Reg(instr.src))); break;}
                    newInstrs.push(instr); break;
                }
                default: newInstrs.push(instr);
            }
        }
        return newInstrs;
    }
}

namespace DeadCodeElimination {
    export function dce(instrs:IR.Instr[]) : IR.Instr[] {
        const lv = new LVAnalysis(instrs);
        const [_, outSets] = lv.getInOut();
        const code:IR.Instr[] = [];
        for (let i = 0; i < instrs.length; i++) {
            const instr = instrs[i];
            const def = lv.getDefOfInstr(instr);
            const out = outSets[i];
            if (def.size === 0) {code.push(instr);}
            else if (instr.kind === "Print") {code.push(instr);}
            else if (instr.kind === "Call") {code.push(instr);}
            else {
                for (const dest of def) {
                    if (out.has(dest)) 
                    {code.push(instr); break;}
                }
            }
        }
        return code;
    }
}

namespace ConstantPropagation {
    export function cp(instrs:IR.Instr[]) : IR.Instr[] {
        const cpa = new CPAnalysis(instrs);
        const [inSets, outSets] = cpa.getInOut();
        const code:IR.Instr[] = [];

        for (let i = 0; i < instrs.length; i++) {
            const instr = instrs[i];
            const inSet = inSets[i];   
            const outSet = outSets[i];

            switch (instr.kind) {
                case "Alloc": {
                    if (instr.operand.kind === "Reg") {
                        const c = inSet.get(instr.operand.name)!; 
                        switch (c.kind) {
                            case "Constant": code.push(IR.Alloc(instr.dest, IR.Imm(c.inner))); break;
                            default: code.push(instr);
                        }
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "BinOp": {
                    let right1 = instr.right1;
                    let right2 = instr.right2;
                    
                    if (instr.right1.kind === "Reg") {
                        const c = inSet.get(instr.right1.name)!;
                        if (c.kind === "Constant") {right1 = IR.Imm(c.inner);}
                    }
                    if (instr.right2.kind === "Reg") {
                        const c = inSet.get(instr.right2.name)!;
                        if (c.kind === "Constant") {right2 = IR.Imm(c.inner);}
                    }

                    const resultC = outSet.get(instr.left)!;
                    switch (resultC.kind) {
                        case "Constant": 
                            code.push(IR.Set(instr.left, IR.Imm(resultC.inner))); 
                            break;
                        default: 
                            code.push(IR.BinOp(instr.left, instr.op, right1, right2));
                    }
                    break;
                }
                case "UnOp": {
                    const resultC = outSet.get(instr.left)!;
                    if (resultC.kind === "Constant") {
                        code.push(IR.Set(instr.left, IR.Imm(resultC.inner)));
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "Call": {
                    const newArgs = [];
                    for (const arg of instr.args) {
                        if (arg.kind === "Reg") {
                            const c = inSet.get(arg.name)!;
                            if (c.kind === "Constant") {newArgs.push(IR.Imm(c.inner));}
                            else {newArgs.push(arg);}
                        } else {
                            newArgs.push(arg);
                        }
                    }
                    code.push(IR.Call(instr.dest, instr.calleeName, newArgs));
                    break;
                }
                case "Print": {
                    if (instr.operand.kind === "Reg") {
                        const c = inSet.get(instr.operand.name)!;
                        if (c.kind === "Constant") {code.push(IR.Print(instr.dest, IR.Imm(c.inner)));}
                        else {code.push(instr);}
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "Ret": {
                    if (instr.operand.kind === "Reg") {
                        const c = inSet.get(instr.operand.name)!;
                        if (c.kind === "Constant") {code.push(IR.Ret(IR.Imm(c.inner)));}
                        else {code.push(instr);}
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "Set": {
                    const resultC = outSet.get(instr.left)!;
                    if (resultC.kind === "Constant") {
                        code.push(IR.Set(instr.left, IR.Imm(resultC.inner)));
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "StoreByte": 
                case "StoreWord": {
                    const isByte = instr.kind === "StoreByte";
                    if (instr.src.kind === "Reg") {
                        const c = inSet.get(instr.src.name)!;
                        if (c.kind === "Constant") {
                            const imm = IR.Imm(c.inner);
                            code.push(isByte ? IR.StoreByte(imm, instr.dest) : IR.StoreWord(imm, instr.dest));
                        } else {
                            code.push(instr);
                        }
                    } else {
                        code.push(instr);
                    }
                    break;
                }
                case "GotoT": {
                    if (instr.cond.kind === "Reg") {
                        const c = inSet.get(instr.cond.name)!;
                        if (c.kind === "Constant") {
                            if (c.inner !== 0) {
                                code.push(IR.Goto(instr.dest as string));
                            }
                        } else {
                            code.push(instr);
                        }
                    } else {
                        if (instr.cond.value !== 0) {
                            code.push(IR.Goto(instr.dest as string));
                        }
                    }
                    break;
                }
                case "GotoF": {
                    if (instr.cond.kind === "Reg") {
                        const c = inSet.get(instr.cond.name)!;
                        if (c.kind === "Constant") {
                            if (c.inner === 0) {
                                code.push(IR.Goto(instr.dest as string));
                            }
                        } else {
                            code.push(instr);
                        }
                    } else {
                        if (instr.cond.value === 0) {
                            code.push(IR.Goto(instr.dest as string));
                        }
                    }
                    break;
                }
                default: code.push(instr);
            }
        }
        return code;
    }
}

function optimizationPass(instrs:IR.Instr[]) : IR.Instr[] {
    let code: IR.Instr[] = Mem2Reg.mem2Reg(instrs);
    code = DeadCodeElimination.dce(code);
    code = ConstantPropagation.cp(code);
    for (let i = 0; i < code.length; i++) {
        const instr = code[i];
        if (instr.kind === "FnDecl") {
            code[i] = IR.FnDecl(instr.name, instr.args, optimizationPass(instr.body));
        }
    }
    return code;
}

function optimize(instrs:IR.Instr[]) : IR.Instr[] {
    let oldInstrs = cloneDeep(instrs);
    let newInstrs = [];
    while (true) {
        newInstrs = optimizationPass(oldInstrs);
        if (isEqual(oldInstrs, newInstrs)) {return oldInstrs;}
        oldInstrs = cloneDeep(newInstrs);
    } 
}

export { optimize }