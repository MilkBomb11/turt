import { assertUnreachable, throwError } from "./helper"

namespace Type {
    interface Int { kind:"Int"; }
    export const Int = { kind:"Int" as const }

    interface Bool { kind:"Bool"; }
    export const Bool = { kind:"Bool" as const }

    interface Ptr {
        kind: "Ptr";
        inner: Type;
    }
    export const Ptr = (inner:Type) => {return {kind:"Ptr" as const, inner:inner};}

    interface Func {
        kind: "Func";
        args: Type[];
        returnType: Type;
    }
    export const Func = (args:Type[], returnType:Type) => {return {kind:"Func" as const, args:args, returnType:returnType};}

    export type Type = Int | Bool | Ptr | Func
    export const atoms = new Set(["int", "bool", "ptr"])

    export function isEqual(t1: Type, t2: Type): boolean {
        if (t1 === t2) return true;
        if (t1.kind !== t2.kind) return false;

        switch (t1.kind) {
            case "Int":
            case "Bool": return true;
            case "Ptr": {
                const t2Ptr = t2 as Ptr;
                return isEqual(t1.inner, t2Ptr.inner);
            }
            case "Func": {
                const t2Func = t2 as Func;            
                if (!isEqual(t1.returnType, t2Func.returnType)) return false;
                if (t1.args.length !== t2Func.args.length) return false;
                for (let i = 0; i < t1.args.length; i++) {
                    if (!isEqual(t1.args[i], t2Func.args[i])) {
                        return false;
                    }
                }
                return true;
            }
            default: assertUnreachable(t1);
        }
    }

    export function toArth(t:Type) : Arth.Type {
        switch (t.kind) {
            case "Int": return Arth.Int;
            case "Bool": return Arth.Bool;
            case "Ptr": return Arth.Ptr(toArth(t.inner));
            case "Func": throwError(0, `Typecheck failure: cannot convert ${stringOfType(t)} to matching arth. This should've been forbidden`)
            default: assertUnreachable(t);
        }
    }

    export function stringOfType (type:Type.Type) : string {
        switch (type.kind) {
            case "Int": return `Int`;
            case "Bool": return `Bool`;
            case "Ptr": return `Ptr(${stringOfType(type.inner)})`;
            case "Func": {
                let args = type.args.map(stringOfType);
                return `(${args.join(',')}) -> ${stringOfType(type.returnType)}`
            }
            default: assertUnreachable(type);
        }
    }

    export function stringOfNameTypePair (ntp:NameTypePair) {return `${ntp.name}:${stringOfType(ntp.type)}`;}
}

namespace Arth {
    interface Int { kind:"Int"; }
    export const Int = { kind:"Int" as const }

    interface Bool { kind:"Bool"; }
    export const Bool = { kind:"Bool" as const }

    interface Ptr {
        kind: "Ptr";
        inner: Type;
    }
    export const Ptr = (inner:Type) => {return {kind:"Ptr" as const, inner:inner};}

    export type Type = Int | Bool | Ptr

    export function isEqual(t1: Type, t2: Type): boolean {
        if (t1 === t2) return true;
        if (t1.kind !== t2.kind) return false;

        switch (t1.kind) {
            case "Int":
            case "Bool": return true;
            case "Ptr": {
                const t2Ptr = t2 as Ptr;
                return isEqual(t1.inner, t2Ptr.inner);
            }
            default: assertUnreachable(t1);
        }
    }
}

interface NameTypePair {
    kind: "NameTypePair";
    name: string
    type: Type.Type
}
const NameTypePair =
    (name:string, type:Type.Type) => {return {kind:"NameTypePair" as const, name:name, type:type};}
    
export { Arth, Type, NameTypePair }