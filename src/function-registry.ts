import type { IR } from "./ir";

namespace FunctionRegistry {
    function appendToRegistry (instrs:IR.Instr[], registry:Map<string, IR.Instr>) : void {
        for (const instr of instrs) {
            if (instr.kind === "FnDecl") {
                registry.set(instr.name, instr);
                appendToRegistry(instr.body, registry);
            }
        }
    }
    
    export function createRegistry (instrs:IR.Instr[]) : Map<string, IR.Instr> {
        const registry: Map<string, IR.Instr> = new Map();
        appendToRegistry(instrs, registry);
        return registry;
    }
}

export { FunctionRegistry }