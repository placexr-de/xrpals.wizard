import {setStep} from "./main.js";

document.addEventListener("DOMContentLoaded", () => {
    setStep(0)

    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
        setStep(1);
        setTimeout(() => {
            window.location.href = 'scanning.html';
        }, 1000);
    });

});