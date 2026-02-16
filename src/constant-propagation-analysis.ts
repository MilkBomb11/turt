import { CFG } from "./cfg";
import { assertUnreachable, bool2Int, throwError } from "./helper";
import { IR } from "./ir";
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
    inSets: Array<D>;
    outSets: Array<D>;
    constructor (public instrs:IR.Instr[]) {
        this.cfg = new CFG(instrs);
        this.allVars = this.getAllVars();
        this.allParams = new Set();
        for (const r of this.allVars) {
            if (r[0] !== '%') 
            {this.allParams.add(r);}
        }

        this.inSets = [];
        this.outSets = [];
        
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

    bopC (c1:C, op:IR.BinOperator, c2:C) : C {
        if (c1.kind === "Nac" || c2.kind === "Nac") {return Nac;}
        if (c1.kind === "Undef" || c2.kind === "Undef") {return Undef;}
        if (c1.kind === "Constant" && c2.kind === "Constant") {
            switch (op) {
                case IR.BinOperator.Add: return Constant((c1.inner+c2.inner)|0);
                case IR.BinOperator.Sub: return Constant((c1.inner-c2.inner)|0);
                case IR.BinOperator.Mul: return Constant((c1.inner*c2.inner)|0);
                case IR.BinOperator.Div: return Constant(Math.floor(c1.inner/c2.inner));
                case IR.BinOperator.Lt: return Constant(bool2Int(c1.inner < c2.inner));
                case IR.BinOperator.Leq: return Constant(bool2Int(c1.inner <= c2.inner));
                case IR.BinOperator.Gt: return Constant(bool2Int(c1.inner > c2.inner));
                case IR.BinOperator.Geq: return Constant(bool2Int(c1.inner >= c2.inner));
                case IR.BinOperator.Eq: return Constant(bool2Int(c1.inner === c2.inner));
                case IR.BinOperator.Neq: return Constant(bool2Int(c1.inner !== c2.inner));
                default: throwError(0, `Invalid binary operator ${op}`);
            }
        }
        return Undef;
    }

    uopC (op:IR.UnOperator, c:C) : C {
        if (c.kind === "Nac") {return Nac;}
        if (c.kind === "Undef") {return Undef;}
        if (c.kind === "Constant") {
            switch (op) {
                case IR.UnOperator.Neg: return Constant((-c.inner)|0);
                case IR.UnOperator.Not: return Constant(bool2Int(!c.inner));
                case IR.UnOperator.UPlus: return Constant(((+c.inner)|0));
                default:throwError(0, `Invalid unary operator ${op}`);
            }
        }
        return Undef;
    }

    findC (reg:reg, d:D) : C {
        const c = cloneDeep(d.get(reg));
        if (c === undefined) {throwError(0, `Cannot access C of ${reg}`)}
        return c;
    }

    transfer (nodeId:number, d:D) : D {
        const instr = this.cfg.getInstr(nodeId);
        switch (instr.kind) {
            case "Alloc":
            case "LoadByte":
            case "LoadWord":
            case "StoreByte":
            case "StoreWord":
            case "Call": {
                const newD = cloneDeep(d);
                newD.set(instr.dest, Nac);
                return newD; 
            }
            case "BinOp": {
                if (instr.right1.kind === "Reg" && instr.right2.kind === "Reg") {
                    const cy = this.findC(instr.right1.name, d);
                    const cz = this.findC(instr.right2.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.bopC(cy, instr.op, cz));
                    return newD;
                }
                else if (instr.right1.kind === "Reg" && instr.right2.kind === "Imm") {
                    const cy = this.findC(instr.right1.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.bopC(cy, instr.op, Constant(instr.right2.value)));
                    return newD;
                }
                else if (instr.right1.kind === "Imm" && instr.right2.kind === "Reg") {
                    const cz = this.findC(instr.right2.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.bopC(Constant(instr.right1.value), instr.op, cz));
                    return newD;
                }
                else if (instr.right1.kind === "Imm" && instr.right2.kind === "Imm") {
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.bopC(Constant(instr.right1.value), instr.op, Constant(instr.right2.value)));
                    return newD;
                }
                else {throwError(0, "Unexpected operand for binop")}
            }
            case "UnOp": {
                if (instr.right.kind === "Reg") {
                    const cy = this.findC(instr.right.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.uopC(instr.op, cy));
                    return newD;
                }
                else if (instr.right.kind === "Imm") {
                    const newD = cloneDeep(d);
                    newD.set(instr.left, this.uopC(instr.op, Constant(instr.right.value)));
                    return newD;
                }
                else {throwError(0, "Unexpected operand for unop")}
            }
            case "Set": {
                if (instr.right.kind === "Reg") {
                    const cy = this.findC(instr.right.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.left, cy);
                    return newD;
                }
                else {
                    const newD = cloneDeep(d);
                    newD.set(instr.left, Constant(instr.right.value));
                    return newD;
                }
            }
            case "Print": {
                if (instr.operand.kind === "Reg") {
                    const cy = this.findC(instr.operand.name, d);
                    const newD = cloneDeep(d);
                    newD.set(instr.dest, cy);
                    return newD;
                }
                else {
                    const newD = cloneDeep(d);
                    newD.set(instr.dest, Constant(instr.operand.value));
                    return newD;
                }
            }
            case "Goto": case "GotoF": case "GotoT": 
            case "Label": case "FnDecl": case "Halt":
            case "Ret": {
                const newD = cloneDeep(d);
                return newD;
            }
            default: assertUnreachable(instr);
        }
    }

    getInOut() {
        for (let i = 0; i < this.cfg.code.length; i++) {
            this.inSets[i] = this.initialD();
            this.outSets[i] = this.initialD();
        }
        let change = true;
        while (change) {
            change = false;
            
        }
    }
}

export { CPAnalysis }