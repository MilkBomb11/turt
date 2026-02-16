import { CFG } from "./cfg";
import { assertUnreachable, setDifference, setUnion } from "./helper";
import type { IR } from "./ir";
import { cloneDeep, isEqual } from "lodash-es"

type reg = string;
type nodeId = number;
class LVAnalysis {
    inSets: Array<Set<reg>>;
    outSets: Array<Set<reg>>;
    cfg: CFG;

    constructor (instrs:IR.Instr[]) {
        this.cfg = new CFG(instrs);
        this.inSets = [];
        this.outSets = [];
    }

    getDefOfInstr (instr:IR.Instr) : Set<reg> {
        switch (instr.kind) {
            case "Alloc": return new Set([instr.dest]);
            case "BinOp": return new Set([instr.left]);
            case "Call": return new Set([instr.dest]);
            case "LoadWord": 
            case "LoadByte": return new Set([instr.dest]);
            case "Print": return new Set ([instr.dest]);
            case "Set": return new Set ([instr.left]);
            case "UnOp": return new Set ([instr.left]);
            case "FnDecl":
            case "Goto": case "GotoF": case "GotoT": 
            case "Halt": case "Label": 
            case "Ret": case "StoreByte": case "StoreWord": return new Set();
            default: assertUnreachable(instr);
        }
    }

    getUseOfInstr (instr:IR.Instr) : Set<reg> {
        switch (instr.kind) {
            case "Alloc": {
                if (instr.operand.kind === "Reg") { return new Set([instr.operand.name]); }
                return new Set()
            }
            case "BinOp": {
                const s: Set<reg> = new Set();
                if (instr.right1.kind === "Reg") {s.add(instr.right1.name);}
                if (instr.right2.kind === "Reg") {s.add(instr.right2.name);}                
                return s;
            }
            case "UnOp": {
                if (instr.right.kind === "Reg") { return new Set([instr.right.name]); }
                return new Set();
            }
            case "Set": {
                if (instr.right.kind === "Reg") { return new Set([instr.right.name]); }
                return new Set();
            }
            case "LoadByte":
            case "LoadWord": return new Set([instr.src]);
            case "StoreByte":
            case "StoreWord": {
                const s: Set<reg> = new Set();
                s.add(instr.dest);
                if (instr.src.kind === "Reg") {s.add(instr.src.name);}
                return s;
            }
            case "GotoF":
            case "GotoT": {
                if (instr.cond.kind === "Reg") {return new Set([instr.cond.name]);}
                return new Set();
            }
            case "Call": {
                const s: Set<reg> = new Set();
                for (const arg of instr.args) {
                    if (arg.kind === "Reg") 
                    {s.add(arg.name);}
                }
                return s;
            }
            case "Print": {
                if (instr.operand.kind === "Reg") {return new Set([instr.operand.name]);}
                return new Set()
            }
            case "Ret": {
                if (instr.operand.kind === "Reg") {return new Set([instr.operand.name]);}
                return new Set();
            }
            case "FnDecl": case "Goto": case "Halt": case "Label": return new Set();
            default: assertUnreachable(instr);
        }
    }

    transfer(lv:Set<reg>, nodeId:nodeId) : Set<reg> {
        const instr = this.cfg.getInstr(nodeId);
        const def = this.getDefOfInstr(instr);
        const use = this.getUseOfInstr(instr);
        return setUnion(setDifference(lv, def), use);
    }

    getInOut () {
        for (let nodeId = 0; nodeId < this.cfg.code.length; nodeId++) {this.inSets[nodeId] = new Set();}
        let change = true;
        while (change) {
            change = false;
            for (let nodeId = this.cfg.code.length - 1; nodeId >= 0; nodeId--) {
                const oldIn = cloneDeep(this.inSets[nodeId]);
                const succs = this.cfg.getSuccs(nodeId)!;
                let col:Set<reg> = new Set();
                for (const s of succs) {
                    const inSet = this.inSets[s];
                    col = setUnion(col, inSet);
                }
                this.outSets[nodeId] =  col;
                this.inSets[nodeId] = this.transfer(this.outSets[nodeId], nodeId);
                if (!isEqual(this.inSets[nodeId], oldIn)) {change = true;}
            }
        }
        return [this.inSets, this.outSets]
    }
}

export { LVAnalysis }