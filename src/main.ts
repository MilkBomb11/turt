import { debug } from "./run";

const textarea = document.querySelector<HTMLTextAreaElement>("#text")!
const go_btn = document.querySelector<HTMLButtonElement>("#btn-play")!

go_btn.addEventListener("click", () => {debug(textarea.value);})