import { LVAnalysis } from "./dfa";
import { IR } from "./ir";
import { cloneDeep, isEqual } from "lodash-es"

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
        const code:IR.Instr[] = []
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

function optimizationPass(instrs:IR.Instr[]) : IR.Instr[] {
    let code: IR.Instr[] = Mem2Reg.mem2Reg(instrs);
    code = DeadCodeElimination.dce(code);
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