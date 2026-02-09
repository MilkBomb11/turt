import type { IR } from "./ir";

namespace FunctionRegistry {
    const registry: Map<string, IR.Instr> = new Map<string, IR.Instr>();
    export function createRegistry (instrs:IR.Instr[]) : Map<string, IR.Instr> {
        for (const instr of instrs) {
            if (instr.kind === "FnDecl") {
                registry.set(instr.name, instr);
                createRegistry(instr.body);
            }
        }
        return registry;
    }
}

export { FunctionRegistry }