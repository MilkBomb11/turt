import { assertUnreachable, throwError } from "./helper";
import type { IR } from "./ir";

class CFG {
    predMap: Map<number, Set<number>>;
    succMap: Map<number, Set<number>>;
    constructor(public code:IR.Instr[]) {
        this.predMap = new Map();
        this.predMap.set(0, new Set());
        this.succMap = new Map();
        this.makeMaps();
    }

    private makeMaps() {
        for (let i = 0; i < this.code.length; i++) {
            const instr = this.code[i];
            switch (instr.kind) {
                case "GotoT": 
                case "GotoF": {
                    if (typeof instr.dest === "string")
                    {throwError(i, `label resolver fail: Label ${instr.dest} unresolved.`);}
                    this.succMap.set(i, new Set([i+1, instr.dest]));

                    const pred1 = this.predMap.get(i+1);
                    if (pred1 === undefined) {this.predMap.set(i+1, new Set([i]));}
                    else {this.predMap.get(i+1)?.add(i);}

                    const pred2 = this.predMap.get(instr.dest);
                    if (pred2 === undefined) {this.predMap.set(instr.dest, new Set([i]));}
                    else {pred2.add(i);}
                    break;
                }
                case "Goto": {
                    if (typeof instr.dest === "string")
                    {throwError(i, `label resolver fail: Label ${instr.dest} unresolved.`);}
                    this.succMap.set(i, new Set([instr.dest]));

                    const pred = this.predMap.get(instr.dest);
                    if (pred === undefined) {this.predMap.set(instr.dest, new Set([i]));}
                    else {pred.add(i);}
                    break;
                }
                case "Alloc": case "BinOp": case "Call":
                case "FnDecl": case "Label": case "LoadByte": case "LoadWord":
                case "StoreByte": case "StoreWord": case "Print": case "Ret": case "Set": case "UnOp": {
                    this.succMap.set(i, new Set([i+1]));

                    const pred = this.predMap.get(i+1);
                    if (pred === undefined) {this.predMap.set(i+1, new Set([i]));}
                    else {pred.add(i);}
                    break;
                }
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