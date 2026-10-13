const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];
export function initWaitlist() {
  const betaForm = $("#beta-form");
  const betaSubmit = $("#beta-submit");
  const externalUrl = import.meta.env.VITE_BETA_URL;
  if (externalUrl) {
    document.querySelectorAll('a[href="#beta-form"]').forEach((link) => {
      link.href = externalUrl;
    });
    const link = document.createElement("a");
    link.className = "form-submit";
    link.href = externalUrl;
    link.textContent = "JOIN THE WAITLIST";
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    link.append(arrow);
    betaForm?.replaceChildren(link);
    return;
  }
  if (betaSubmit) betaSubmit.disabled = false;
  const betaSubmitContent = betaSubmit
    ? [...betaSubmit.childNodes].map((node) => node.cloneNode(true))
    : [];
  let betaSubmitting = false;
  let betaSubmitted = false;

  function betaStatus(message, isError = false) {
    const status = $("#beta-status");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.setAttribute("role", isError ? "alert" : "status");
    status.setAttribute("aria-live", isError ? "assertive" : "polite");
  }

  betaForm?.addEventListener("input", (event) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    )
      event.target.removeAttribute("aria-invalid");
  });
  betaForm?.addEventListener(
    "invalid",
    (event) => {
      event.target.setAttribute("aria-invalid", "true");
      const firstInvalid = betaForm.querySelector(
        "input:invalid, select:invalid",
      );
      if (firstInvalid && event.target !== firstInvalid) return;
      betaStatus(
        event.target.name === "email"
          ? "Enter a valid email address so we can keep you posted."
          : "Add your name so we know what to call you.",
        true,
      );
    },
    true,
  );

  betaForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (betaSubmitting || betaSubmitted) return;
    const nameInput = $('[name="name"]', betaForm);
    const emailInput = $('[name="email"]', betaForm);
    const campusInput = $('[name="campus"]', betaForm);
    if (!nameInput || !emailInput || !campusInput) {
      betaStatus("The form is unavailable. Please try again shortly.", true);
      return;
    }
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    nameInput.value = name;
    emailInput.value = email;
    if (!betaForm.checkValidity()) {
      $$("input, select", betaForm).forEach((input) =>
        input.setAttribute("aria-invalid", String(!input.validity.valid)),
      );
      betaForm.reportValidity();
      betaStatus("Check the highlighted fields and try again.", true);
      return;
    }
    if (!name) {
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.focus();
      betaStatus("Add your name so we know what to call you.", true);
      return;
    }
    const website = $("#beta-honeypot")?.value || "";
    betaSubmitting = true;
    if (betaSubmit) {
      betaSubmit.disabled = true;
      betaSubmit.textContent = "SENDING…";
    }
    betaForm.setAttribute("aria-busy", "true");
    betaStatus("Joining the waitlist…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        import.meta.env.VITE_BETA_ENDPOINT || "/api/beta",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            campus: campusInput.value,
            website,
            source: "side-quest-marketing",
          }),
          signal: controller.signal,
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "That did not go through. Please try again in a moment.",
        );
      }
      betaSubmitted = true;
      betaForm.classList.add("is-success");
      betaStatus("You’re on the waitlist. We’ll email when your campus opens.");
      if (betaSubmit) betaSubmit.textContent = "YOU’RE ON THE LIST";
      $$("input, select", betaForm).forEach((input) => {
        input.disabled = true;
      });
    } catch (error) {
      betaStatus(
        error.name === "AbortError"
          ? "That took a little too long. Please try again."
          : error.message || "That did not go through. Please try again.",
        true,
      );
      if (betaSubmit) {
        betaSubmit.disabled = false;
        betaSubmit.replaceChildren(
          ...betaSubmitContent.map((node) => node.cloneNode(true)),
        );
      }
    } finally {
      clearTimeout(timeout);
      betaSubmitting = false;
      betaForm.setAttribute("aria-busy", "false");
    }
  });
}
