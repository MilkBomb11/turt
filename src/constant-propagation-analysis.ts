import { CFG } from "./cfg";
import { assertUnreachable, throwError } from "./helper";
import type { IR } from "./ir";
import { cloneDeep } from "lodash-es";

interface Constant {
    kind: "Constant";
    inner: number;
}
export const Constant = 
    (inner:number) => {return {kind:"Constant" as const, inner:inner};}

interface Nac {
    kind: "Nac";
}
export const Nac = {kind: "Nac" as const}

interface Undef {
    kind: "Undef";
}
export const Undef = {kind: "Undef" as const}

type reg = string
type C = Constant | Nac | Undef
type D = Map<reg, C>

class CPAnalysis {
    cfg:CFG
    allVars: Set<reg>;
    allParams: Set<reg>;
    constructor (public instrs:IR.Instr[]) {
        this.cfg = new CFG(instrs);
        this.allVars = this.getAllVars();
        this.allParams = new Set();
        for (const r of this.allVars) {
            if (r[0] !== '%') 
            {this.allParams.add(r);}
        }
    }

    joinC (c1:C, c2:C) : C {
        if (c1.kind === "Nac" || c2.kind === "Nac") {return Nac;}
        if (c1.kind === "Undef") {return cloneDeep(c2);}
        if (c2.kind === "Undef") {return cloneDeep(c1);}
        if (c1.inner === c2.inner) {return cloneDeep(c1);}
        else {return Nac;}
    }

    joinD (d1:D, d2:D) : D {
        const d:D = new Map();
        for (const [variable, c] of d1) {
            const c2 = cloneDeep(d2.get(variable));
            if (c2 === undefined) {throwError(0, `cannot find variable ${variable} to join.`);}
            d.set(variable, this.joinC(c, c2));
        }
        return d;
    }

    getAllVars () : Set<reg> {
        const acc: Set<reg> = new Set();
        for (const instr of this.instrs) {
            const regs = this.getVarsOfInstr(instr);
            for (const reg of regs) {acc.add(reg);}
        }
        return acc;
    }

    initialD () : D {
        const d: D = new Map();
        for (const v of this.allVars) {d.set(v, Undef);}
        for (const v of this.allParams) {d.set(v, Nac);}
        return d;
    }

    getVarsOfInstr (instr:IR.Instr) : Set<reg> {
        switch (instr.kind) {
            case "Alloc": {
                const s = new Set([instr.dest]);
                if (instr.operand.kind === "Reg") {s.add(instr.operand.name);}
                return s;
            }
            case "Set": {
                const s = new Set([instr.left]);
                if (instr.right.kind === "Reg") {s.add(instr.right.name);}
                return s;
            }
            case "BinOp": {
                const s = new Set([instr.left]);
                if (instr.right1.kind === "Reg") {s.add(instr.right1.name);}
                if (instr.right2.kind === "Reg") {s.add(instr.right2.name);}
                return s; 
            }
            case "UnOp": {
                const s = new Set([instr.left]);
                if (instr.right.kind === "Reg") {s.add(instr.right.name);}
                return s;
            }
            case "Call": {
                const s = new Set([instr.dest]);
                for (const arg of instr.args) {
                    if (arg.kind === "Reg") 
                    {s.add(arg.name);}
                }
                return s;
            }
            case "GotoT": case "GotoF": {
                if (instr.cond.kind === "Reg") { return new Set([instr.cond.name]); }
                return new Set();
            }
            case "Print": case "Ret": {
                if (instr.operand.kind === "Reg") { return new Set([instr.operand.name]); }
                return new Set();
            }
            case "StoreByte": case "StoreWord": {
                const s = new Set([instr.dest]);
                if (instr.src.kind === "Reg") {s.add(instr.src.name);}
                return s;
            }
            case "LoadByte": case "LoadWord": {return new Set([instr.dest, instr.src]);}
            case "FnDecl": case "Goto": case "Halt": case "Label": return new Set();
            default: assertUnreachable(instr);
        }
    }
}

export { CPAnalysis }