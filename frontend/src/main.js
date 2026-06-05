import '../public/styles/main.css'

export function formatTime(ts) {
    return new Date(ts).toLocaleTimeString();
}

export function setStep(stepIndex) {
    const steps = document.querySelectorAll(".steps li");

    steps.forEach((el, i) => {
        el.classList.remove("done", "current", "todo");

        if (i < stepIndex) el.classList.add("done");
        else if (i === stepIndex) el.classList.add("current");
        else el.classList.add("todo");
    });
}

function setIn(obj, path, value) {
    const [head, ...rest] = path;
    if (!head) return obj;

    // clone current level
    const next = Array.isArray(obj) ? obj.slice() : {...obj};

    if (rest.length === 0) {
        next[head] = value;
        return next;
    }

    next[head] = setIn(obj?.[head] ?? {}, rest, value);
    return next;
}

export function attachListenerToControl(store, el, event, path, transform = (v) => v, init = false) {
    if (!el) return;

    const readRawValue = () => {
        if (el instanceof HTMLInputElement) {
            if (el.type === "checkbox") return el.checked;
            if (el.type === "file") return el.files?.[0] ?? null;
            if (el.type === "number" || el.type === "range") return el.valueAsNumber;
        }
        return el.value;
    };

    const apply = () => {
        const raw = readRawValue();
        const value = transform(raw);
        store.setState((s) => setIn(s, path, value));
        console.log("changed: ", path, value);
    };

    if (init) apply();
    el.addEventListener(event, apply);
}

document.addEventListener("DOMContentLoaded", () => {

});