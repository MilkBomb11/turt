import { assertUnreachable } from "./helper";

export namespace IR {
    interface Reg {
        kind: "Reg";
        name: string;
    }
    export const Reg = (name:string) => {return {kind:"Reg" as const, name:name};}

    interface Imm {
        kind: "Imm";
        value: number;
    }
    export const Imm = (value:number) => {return {kind:"Imm" as const, value:value};}
    export type Operand = Reg | Imm

    interface Alloc {
        kind: "Alloc";
        dest: string;
        operand: Operand;
    }
    export const Alloc = (dest:string, operand:Operand) => {return {kind:"Alloc" as const, dest:dest, operand:operand};}

    interface Set {
        kind: "Set";
        left: string
        right: Operand
    }
    export const Set = (left:string, right:Operand) => {return {kind:"Set" as const, left:left, right:right};}

    interface BinOp {
        kind: "BinOp";
        left: string;
        op: BinOperator;
        right1: Operand;
        right2: Operand;
    }
    export const BinOp = 
        (left:string, op:BinOperator, right1:Operand, right2:Operand) => {return {kind:"BinOp" as const, left:left, op:op, right1:right1, right2:right2};}

    interface UnOp {
        kind: "UnOp";
        left: string;
        op: UnOperator;
        right: Operand;
    }
    export const UnOp =
        (left:string, op:UnOperator, right:Operand) => {return {kind:"UnOp" as const, left:left, op:op, right:right};}

    interface LoadWord {
        kind: "LoadWord";
        dest: string;
        src: string;
    }
    export const LoadWord =
        (dest:string, src:string) => {return {kind:"LoadWord" as const, dest:dest, src:src};}
    
    interface LoadByte {
        kind:"LoadByte";
        dest: string;
        src: string;
    }
    export const LoadByte =
        (dest:string, src:string) => {return {kind:"LoadByte" as const, dest:dest, src:src};}

    interface StoreWord { // *(dest) = src
        kind: "StoreWord";
        src: Operand;
        dest: string;
    }
    export const StoreWord =
        (src:Operand, dest:string) => {return {kind:"StoreWord" as const, src:src, dest:dest};}
    
    interface StoreByte {
        kind: "StoreByte";
        src: Operand;
        dest: string;
    }
    export const StoreByte =
        (src:Operand, dest:string) => {return {kind:"StoreByte" as const, src:src, dest:dest};}
    
    interface Label {
        kind: "Label";
        label: string;
    } 
    export const Label =
        (label:string) => {return {kind:"Label" as const, label:label};}
    
    interface Goto {
        kind: "Goto";
        dest: string;
    }
    export const Goto =
        (dest:string) => {return {kind:"Goto" as const, dest:dest};}
    
    interface GotoT {
        kind: "GotoT";
        cond: Operand;
        dest: string;
    }
    export const GotoT =
        (cond:Operand, dest:string) => {return {kind:"GotoT" as const, cond:cond, dest:dest};}
    
    interface GotoF {
        kind: "GotoF";
        cond: Operand;
        dest: string;
    }
    export const GotoF =
        (cond:Operand, dest:string) => {return {kind:"GotoF" as const, cond:cond, dest:dest};}
    
    interface Call {
        kind: "Call";
        dest: string;
        calleeName: string;
        args: string[];
    }
    export const Call =
        (dest:string, calleeName:string, args:string[]) => {return {kind:"Call" as const, dest:dest, calleeName:calleeName, args:args};}
    
    interface Ret {
        kind: "Ret";
        operand: Operand;
    }
    export const Ret =
        (operand:Operand) => {return {kind:"Ret" as const, operand:operand};}

    interface FnDecl {
        kind: "FnDecl";
        name: string;
        args: string[];
        body: Instr[];
    }
    export const FnDecl =
        (name:string, args:string[], body:Instr[]) => {return {kind:"FnDecl" as const, name:name, args:args, body:body};}
    
    export type Instr = Alloc | Set | BinOp | UnOp 
                        | LoadWord | LoadByte | StoreWord | StoreByte | Label | Goto | GotoF | GotoT | Call | FnDecl | Ret
}

export namespace IR {
    export enum BinOperator {
        Add = "+",
        Sub = "-",
        Mul = "*",
        Div = "/",
        Lt = "<",
        Leq = "<=",
        Gt = ">",
        Geq = ">=",
        Eq = "==",
        Neq = "!=",
    }

    export enum UnOperator {
        Neg = "-",
        UPlus = "+",
        Not = "!",
    }
}

export namespace IR {
    function stringOfOperand (operand:IR.Operand) : string {
        switch (operand.kind) {
            case "Imm": return `${operand.value}`
            case "Reg": return operand.name;
            default: assertUnreachable(operand);
        }
    }

    function stringOfInstr (instr:IR.Instr, padding:string) : string {
        switch (instr.kind) {
            case "Alloc": return `${instr.dest} = alloc(${stringOfOperand(instr.operand)})`;
            case "BinOp": return `${instr.left} = ${stringOfOperand(instr.right1)} ${instr.op} ${stringOfOperand(instr.right2)}`;
            case "UnOp": return `${instr.left} = ${instr.op} ${stringOfOperand(instr.right)}`;
            case "Call": return `${instr.dest} = call (${instr.calleeName}|${instr.args.join(',')})`;
            case "FnDecl": return `fn ${instr.name} [${instr.args.join(',')}]:\n${stringOfInstrs(instr.body, padding+"    ")}`;
            case "Goto": return `goto ${instr.dest}`
            case "GotoF": return `$if not ${stringOfOperand(instr.cond)} goto ${instr.dest}`
            case "GotoT": return `$if ${stringOfOperand(instr.cond)} goto ${instr.dest}`
            case "Label": return `label ${instr.label}`
            case "LoadByte": return `${instr.dest} = *(${instr.src}) [byte]`
            case "LoadWord": return `${instr.dest} = *(${instr.src}) [word]`
            case "StoreByte": return `*(${instr.dest}) = ${stringOfOperand(instr.src)} [byte]`
            case "StoreWord": return `*(${instr.dest}) = ${stringOfOperand(instr.src)} [word]`
            case "Ret": return `ret ${stringOfOperand(instr.operand)}`
            case "Set": return `${instr.left} = ${stringOfOperand(instr.right)}`
            default: assertUnreachable(instr);
        }
    }

    export function stringOfInstrs (instrs:IR.Instr[], padding:string) : string {
        return instrs
                .map((i) => {return stringOfInstr(i, padding)})
                .map((s) => {return padding+s;})
                .join('\n')
                 + "\n";
    }
}

