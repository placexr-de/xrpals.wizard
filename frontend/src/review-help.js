const openButton = document.getElementById("placementHelpToggle");
const closeButton = document.getElementById("placementHelpClose");
const drawer = document.getElementById("placementHelpPanel");
const backdrop = document.getElementById("placementHelpBackdrop");

if (openButton && closeButton && drawer && backdrop) {
    let previouslyFocused = null;

    const focusableSelector = [
        "a[href]",
        "button:not(:disabled)",
        "input:not(:disabled)",
        "textarea:not(:disabled)",
        "select:not(:disabled)",
        "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    function getFocusableElements() {
        return [...drawer.querySelectorAll(focusableSelector)]
            .filter((element) => !element.hasAttribute("hidden"));
    }

    function openDrawer() {
        previouslyFocused = document.activeElement;
        backdrop.hidden = false;
        drawer.inert = false;
        drawer.setAttribute("aria-hidden", "false");
        openButton.setAttribute("aria-expanded", "true");

        requestAnimationFrame(() => {
            backdrop.classList.add("is-visible");
            drawer.classList.add("is-open");
            closeButton.focus();
        });
    }

    function closeDrawer({ restoreFocus = true } = {}) {
        drawer.classList.remove("is-open");
        backdrop.classList.remove("is-visible");
        drawer.setAttribute("aria-hidden", "true");
        drawer.inert = true;
        openButton.setAttribute("aria-expanded", "false");

        window.setTimeout(() => {
            if (!drawer.classList.contains("is-open")) {
                backdrop.hidden = true;
            }
        }, 220);

        if (restoreFocus && previouslyFocused instanceof HTMLElement) {
            previouslyFocused.focus();
        }
    }

    openButton.addEventListener("click", () => {
        if (drawer.classList.contains("is-open")) closeDrawer();
        else openDrawer();
    });

    closeButton.addEventListener("click", () => closeDrawer());
    backdrop.addEventListener("click", () => closeDrawer());

    document.addEventListener("keydown", (event) => {
        if (!drawer.classList.contains("is-open")) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeDrawer();
            return;
        }

        if (event.key === "Tab") {
            const focusable = getFocusableElements();
            if (!focusable.length) {
                event.preventDefault();
                closeButton.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}
