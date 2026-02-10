import { assertUnreachable, throwError } from "./helper";
import { IR } from "./ir";

namespace LabelResolver {
    function createLabelIndexMap (instrs:IR.Instr[]) : Map<string, number> {
        const labelIndexMap: Map<string, number> = new Map();
        for (let i = 0; i < instrs.length; i++) {
            const instr = instrs[i];
            if (instr.kind === "Label") 
            {labelIndexMap.set(instr.label, i);}
        }
        return labelIndexMap;
    }

    export function resolveLabels (instrs:IR.Instr[]) : IR.Instr[] {
        const labelIndexMap = createLabelIndexMap(instrs);
        for (let i = 0; i < instrs.length; i++) {
            const instr = instrs[i];
            switch (instr.kind) {
                case "FnDecl": resolveLabels(instr.body); break;
                case "GotoT": {
                    if (typeof instr.dest === "string" && labelIndexMap.has(instr.dest)) {
                        const destIndex = labelIndexMap.get(instr.dest);
                        if (destIndex === undefined) {throwError(i, `Destination label of ${instr.kind} not resolved.`);}
                        instr.dest = destIndex;
                    }
                    break;
                }
                case "GotoF": {
                    if (typeof instr.dest === "string" && labelIndexMap.has(instr.dest)) {
                        const destIndex = labelIndexMap.get(instr.dest);
                        if (destIndex === undefined) {throwError(i, `Destination label of ${instr.kind} not resolved.`);}
                        instr.dest = destIndex;
                    }
                    break;
                }
                case "Goto" : {
                    if (typeof instr.dest === "string" && labelIndexMap.has(instr.dest)) {
                        const destIndex = labelIndexMap.get(instr.dest);
                        if (destIndex === undefined) {throwError(i, `Destination label of ${instr.kind} not resolved.`);}
                        instr.dest = destIndex;
                    }
                    break;
                }
                case "Alloc": case "BinOp" : case "Call" : 
                case "Label": case "LoadByte": case "LoadWord": 
                case "Ret": case "Set": case "StoreByte": case "StoreWord": case "UnOp": case "Print": case "Halt": break;
                default: assertUnreachable(instr)
            }
        }
        return instrs;
    }
}

export { LabelResolver }