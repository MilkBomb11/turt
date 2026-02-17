import { runAndDisplay } from "./run";

const textarea = document.querySelector<HTMLTextAreaElement>("#text")!
const go_btn = document.querySelector<HTMLButtonElement>("#btn-play")!
const terminalOutput = document.querySelector<HTMLDivElement>("#terminal-output")!;
const irOutput = document.querySelector<HTMLDivElement>("#ir-output")!;
const clear_btn = document.querySelector<HTMLButtonElement>("#btn-clear")!;


go_btn.addEventListener("click", () => {
    if (terminalOutput) {
        terminalOutput.innerHTML = ''; // Clear previous output
    }
    if (irOutput) {
        irOutput.innerHTML = ''; // Clear previous IR output
    }
    runAndDisplay(textarea.value, terminalOutput, irOutput);
})

clear_btn.addEventListener("click", () => {
    if (terminalOutput) {
        terminalOutput.innerHTML = '';
    }
    if (irOutput) {
        irOutput.innerHTML = '';
    }
});