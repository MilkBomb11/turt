import { CFG } from "./cfg";
import { throwError } from "./helper";
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
    constructor (instrs:IR.Instr[]) {
        this.cfg = new CFG(instrs);
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
}

export { CPAnalysis }