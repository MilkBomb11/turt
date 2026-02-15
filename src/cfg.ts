import { assertUnreachable, throwError } from "./helper";
import type { IR } from "./ir";

class CFG {
    predMap: Map<number, Set<number>>;
    succMap: Map<number, Set<number>>;
    labelMap: Map<string, number>;
    constructor(public code:IR.Instr[]) {
        this.predMap = new Map();
        this.predMap.set(0, new Set());
        this.succMap = new Map();
        this.labelMap = new Map();

        for (let i = 0; i < this.code.length; i++) {
            const instr = this.code[i];
            if (instr.kind === "Label") {this.labelMap.set(instr.label, i);}
        }
        this.makeMaps();
    }

    getPreds(nodeId:number) {return this.predMap.get(nodeId);}
    getSuccs (nodeId:number) {return this.succMap.get(nodeId);}
    getInstr (nodeId:number) {return this.code[nodeId];}

    private makeMaps() {
        for (let i = 0; i < this.code.length; i++) {
            const instr = this.code[i];
            switch (instr.kind) {
                case "GotoT": 
                case "GotoF": {
                    if (typeof instr.dest === "number") {throwError(i, `label was unexpectedly resolved`);}
                    const resolvedDest = this.labelMap.get(instr.dest)!;
                    let predDest = this.predMap.get(resolvedDest);
                    if (predDest === undefined) { predDest = new Set(); this.predMap.set(resolvedDest, predDest); }
                    predDest.add(i);

                    if (i + 1 < this.code.length) {
                        this.succMap.set(i, new Set([i+1, resolvedDest]));
                        let predNext = this.predMap.get(i+1);
                        if (predNext === undefined) { predNext = new Set(); this.predMap.set(i+1, predNext); }
                        predNext.add(i);
                    } 
                    else {this.succMap.set(i, new Set([resolvedDest]));}
                    break;
                }
                case "Goto": {
                    if (typeof instr.dest === "number") {throwError(i, `label was unexpectedly resolved`);}
                    const resolvedDest = this.labelMap.get(instr.dest)!;
                    this.succMap.set(i, new Set([resolvedDest]));

                    const pred = this.predMap.get(resolvedDest);
                    if (pred === undefined) {this.predMap.set(resolvedDest, new Set([i]));}
                    else {pred.add(i);}
                    break;
                }
                case "Alloc": case "BinOp": case "Call":
                case "FnDecl": case "Label": case "LoadByte": case "LoadWord":
                case "StoreByte": case "StoreWord": case "Print": case "Set": case "UnOp": {
                    if (i + 1 < this.code.length) {
                        this.succMap.set(i, new Set([i+1]));
                        let pred = this.predMap.get(i+1);
                        if (pred === undefined) { pred = new Set(); this.predMap.set(i+1, pred); }
                        pred.add(i);
                    } 
                    else {this.succMap.set(i, new Set());}
                    break;
                }
                case "Ret":
                case "Halt": this.succMap.set(i, new Set()); break;
                default: assertUnreachable(instr);
            }
        }
    }

    private stringOfSet (s:Set<number>) : string {
        const arr = [];
        for (const v of s) {arr.push(v);}
        return `[${arr.join(',')}]`
    }

    private stringOfMap(m:Map<number, Set<number>>) : string {
        let str = "";
        for (const [k, v] of m) {
            str += `${k} -> ${this.stringOfSet(v)}\n`;
        }
        return str;
    } 

    toString() {
        const predMapStr = this.stringOfMap(this.predMap);
        const succMapStr = this.stringOfMap(this.succMap);
        return `<predecessor map>\n${predMapStr}<successor map>\n${succMapStr}`;
    }
}

export { CFG }