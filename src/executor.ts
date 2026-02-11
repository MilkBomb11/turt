import { assertUnreachable, bool2Int, throwError } from "./helper";
import { IR } from "./ir";
import { Memory } from "./memory";

interface CodeAddr {
    functionName: string | undefined;
    index: number;
}
let CodeAddr = (functionName:string|undefined, index:number) => {return {functionName:functionName, index:index}}

type Env = Map<string, number>;

class Executor {
    memory:Memory;
    pc: CodeAddr;
    returnAddrStack: CodeAddr[];
    returnRegStack: string[]; 
    envStack: Env[];
    currentEnv: Env;

    constructor (public code:IR.Instr[], public functionRegistry:Map<string, IR.Instr>, public onPrint?: (s:string) => void) {
        this.memory = new Memory();
        this.pc = CodeAddr(undefined, 0);
        this.returnAddrStack = [];
        this.returnRegStack = [];
        this.envStack = [];
        this.currentEnv = new Map();
    }

    fetchInstr () : IR.Instr {
        const functionName = this.pc.functionName;
        const index = this.pc.index;
        if (functionName === undefined) {return this.code[index];}
        else {
            const functionNode = this.functionRegistry.get(functionName);
            if (functionNode === undefined) {throwError(this.pc.index, `Function ${functionName} not in registry`)}
            if (functionNode.kind !== "FnDecl") {throwError(this.pc.index, `Non FnDecl ${functionName} in registry`)}
            return functionNode.body[index];
        }
    }

    lookupReg (reg:string) : number {
        const value = this.currentEnv.get(reg);
        if (value === undefined) {throwError(this.pc.index, `Failed to get value of register ${reg}`);}
        return value;
    }

    getOperandValue (operand:IR.Operand) : number {
        switch (operand.kind) {
            case "Imm": return operand.value;
            case "Reg": return this.lookupReg(operand.name);
            default: assertUnreachable(operand);
        }
    }

    execute () : void {
        while (true) {
            const instr = this.fetchInstr();
            switch (instr.kind) {
                case "Set": {
                    this.currentEnv.set(instr.left, this.getOperandValue(instr.right));
                    this.pc.index++;
                    break;
                }
                case "Alloc": {
                    const operandValue = this.getOperandValue(instr.operand);
                    const addr = this.memory.allocate(operandValue);
                    this.currentEnv.set(instr.dest, addr);
                    this.pc.index++;
                    break;
                }
                case "BinOp": {
                    const right1Value = this.getOperandValue(instr.right1);
                    const right2Value = this.getOperandValue(instr.right2);
                    switch (instr.op) {
                        case IR.BinOperator.Add: this.currentEnv.set(instr.left, (right1Value + right2Value) | 0); break;
                        case IR.BinOperator.Sub: this.currentEnv.set(instr.left, (right1Value - right2Value) | 0); break;
                        case IR.BinOperator.Mul: this.currentEnv.set(instr.left, (right1Value * right2Value) | 0); break;
                        case IR.BinOperator.Div: this.currentEnv.set(instr.left, Math.floor(right1Value / right2Value)); break;
                        case IR.BinOperator.Lt: this.currentEnv.set(instr.left, bool2Int(right1Value < right2Value)); break;
                        case IR.BinOperator.Leq: this.currentEnv.set(instr.left, bool2Int(right1Value <= right2Value)); break;
                        case IR.BinOperator.Gt: this.currentEnv.set(instr.left, bool2Int(right1Value > right2Value)); break;
                        case IR.BinOperator.Geq: this.currentEnv.set(instr.left, bool2Int(right1Value >= right2Value)); break;
                        case IR.BinOperator.Eq:  this.currentEnv.set(instr.left, bool2Int(right1Value === right2Value)); break;
                        case IR.BinOperator.Neq: this.currentEnv.set(instr.left, bool2Int(right1Value !== right2Value)); break;
                    }
                    this.pc.index++;
                    break;
                }
                case "UnOp": {
                    const operandValue = this.getOperandValue(instr.right);
                    switch (instr.op) {
                        case IR.UnOperator.Neg: this.currentEnv.set(instr.left, -operandValue); break;
                        case IR.UnOperator.UPlus: this.currentEnv.set(instr.left, +operandValue); break;
                        case IR.UnOperator.Not: this.currentEnv.set(instr.left, bool2Int(!operandValue)); break;
                    }
                    this.pc.index++;
                    break;
                }
                case "LoadByte": {
                    const value = this.memory.loadByte(this.lookupReg(instr.src));
                    this.currentEnv.set(instr.dest, value);
                    this.pc.index++;
                    break;
                }
                case "LoadWord": {
                    const value = this.memory.loadWord(this.lookupReg(instr.src));
                    this.currentEnv.set(instr.dest, value);
                    this.pc.index++;
                    break;
                }
                case "StoreByte": {
                    const value = this.getOperandValue(instr.src);
                    this.memory.storeByte(this.lookupReg(instr.dest), value);
                    this.pc.index++;
                    break;
                }
                case "StoreWord": {
                    const value = this.getOperandValue(instr.src);
                    this.memory.storeWord(this.lookupReg(instr.dest), value);
                    this.pc.index++;
                    break;
                }
                case "Goto": {
                    if (typeof instr.dest === "string") {throwError(this.pc.index, `Label was not resolved.`);}
                    this.pc.index = instr.dest;
                    break;
                }
                case "GotoT": {
                    const value = this.getOperandValue(instr.cond);
                    if (typeof instr.dest === "string") {throwError(this.pc.index, `Label was not resolved.`);}
                    if (value) {this.pc.index = instr.dest;}
                    else {this.pc.index++;}
                    break;
                }
                case "GotoF": {
                    const value = this.getOperandValue(instr.cond);
                    if (typeof instr.dest === "string") {throwError(this.pc.index, `Label was not resolved.`);}
                    if (!value) {this.pc.index = instr.dest;}
                    else {this.pc.index++;}
                    break;
                }
                case "Print": {
                    const value = this.getOperandValue(instr.operand);
                    this.currentEnv.set(instr.dest, value);
                    if (this.onPrint === undefined) {console.log(value);}
                    else {this.onPrint(value.toString());}
                    this.pc.index++;
                    break;
                }
                case "Call": {
                    const calleeNode = this.functionRegistry.get(instr.calleeName);
                    if (calleeNode === undefined) {throwError(this.pc.index, `Cannot find function ${instr.calleeName} in registry`);}
                    if (calleeNode.kind !== "FnDecl") {throwError(this.pc.index, `Non function ${instr.calleeName} in registry`);}
                    this.envStack.push(this.currentEnv);
                    this.returnAddrStack.push(CodeAddr(this.pc.functionName, this.pc.index+1));
                    this.returnRegStack.push(instr.dest);
                    const newEnv: Env = new Map();
                    for (let i = 0; i < calleeNode.args.length; i++) {
                        const formalArg = calleeNode.args[i];
                        const value = this.getOperandValue(instr.args[i]);
                        newEnv.set(formalArg, value);
                    }
                    this.pc = CodeAddr(instr.calleeName, 0);
                    this.currentEnv = newEnv;
                    break;
                }
                case "Ret": {
                    const returnValue = this.getOperandValue(instr.operand);
                    const prevEnv = this.envStack.pop();
                    const retReg = this.returnRegStack.pop();
                    const retAddr = this.returnAddrStack.pop();
                    if (prevEnv === undefined || retReg === undefined || retAddr === undefined) 
                        {throwError(this.pc.index, `Tried to return outside any function.`)}
                    this.currentEnv = prevEnv;
                    this.currentEnv.set(retReg, returnValue);
                    this.pc = retAddr;
                    break;
                }
                case "Halt": return;
                case "FnDecl": case "Label": this.pc.index++; break;
                default: assertUnreachable(instr);
            }
        }
    }
}

export { Executor }