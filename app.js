/**
 * License-based AI Review Assist checkout
 * Default: 5 seats (not full team) — removes sticker-shock barrier
 */

const TEAM_SIZE = 100;
const PRICE_PER_LICENSE_MONTH = 9;
const YEARLY_DISCOUNT = 0.2; // 20% off yearly
const PRORATE_DAYS = 353;
const DAYS_IN_YEAR = 365;

const state = {
  licenses: 5,
  cycle: "yearly", // monthly | yearly
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function clampLicenses(n) {
  const num = Number.parseInt(n, 10);
  if (Number.isNaN(num)) return 1;
  return Math.min(TEAM_SIZE, Math.max(1, num));
}

function monthlyRate() {
  return PRICE_PER_LICENSE_MONTH;
}

function yearlyRatePerLicense() {
  return PRICE_PER_LICENSE_MONTH * 12 * (1 - YEARLY_DISCOUNT);
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function compute() {
  const qty = state.licenses;
  const monthlySubtotal = qty * monthlyRate();
  const yearlySubtotal = qty * yearlyRatePerLicense();

  // Card always shows monthly-equivalent framing + selected cycle total
  const cardTotal =
    state.cycle === "yearly" ? yearlySubtotal : monthlySubtotal;
  const cardCycleLabel = state.cycle === "yearly" ? "year" : "month";

  // Proration against yearly if yearly selected, else monthly remaining days ~30
  let prorate;
  if (state.cycle === "yearly") {
    prorate = (yearlySubtotal / DAYS_IN_YEAR) * PRORATE_DAYS;
  } else {
    // ~remaining month portion for demo
    prorate = monthlySubtotal * (PRORATE_DAYS / DAYS_IN_YEAR);
  }

  return {
    qty,
    monthlySubtotal,
    yearlySubtotal,
    cardTotal,
    cardCycleLabel,
    prorate,
    unitDisplay:
      state.cycle === "yearly"
        ? `${qty} × ${formatMoney(yearlyRatePerLicense())}`
        : `${qty} × ${formatMoney(monthlyRate())}`,
    resultDisplay:
      state.cycle === "yearly"
        ? `${formatMoney(yearlySubtotal)}/yr`
        : `${formatMoney(monthlySubtotal)}/mo`,
  };
}

function syncUI() {
  const c = compute();
  const input = $("#license-input");
  const dec = $("#btn-dec");
  const inc = $("#btn-inc");

  if (input && document.activeElement !== input) {
    input.value = String(c.qty);
  }
  input?.setAttribute("max", String(TEAM_SIZE));
  if (dec) dec.disabled = c.qty <= 1;
  if (inc) inc.disabled = c.qty >= TEAM_SIZE;

  const lineTotal = $("#aira-line-total");
  const lineSub = $("#aira-line-sub");
  if (lineTotal) {
    lineTotal.textContent = formatMoney(c.cardTotal);
    lineTotal.classList.remove("price-flash");
    void lineTotal.offsetWidth;
    lineTotal.classList.add("price-flash");
  }
  if (lineSub) {
    lineSub.textContent = `${c.qty} license${c.qty === 1 ? "" : "s"} · ${state.cycle}`;
  }

  const mathFormula = $("#math-formula");
  const mathResult = $("#math-result");
  if (mathFormula) mathFormula.textContent = c.unitDisplay;
  if (mathResult) mathResult.textContent = c.resultDisplay;

  const annualDesc = $("#annual-desc");
  const annualAmt = $("#annual-amt");
  const renewalHeading = $("#renewal-heading");
  const renewalNote = $("#renewal-note");
  if (state.cycle === "yearly") {
    if (renewalHeading) renewalHeading.textContent = "New annual charge";
    if (annualDesc)
      annualDesc.textContent = `${c.qty} license${c.qty === 1 ? "" : "s"} · billed yearly`;
    if (annualAmt) annualAmt.textContent = formatMoney(c.yearlySubtotal);
    if (renewalNote)
      renewalNote.textContent = "Applicable at plan renewal — Jul 24, 2027";
  } else {
    if (renewalHeading) renewalHeading.textContent = "New monthly charge";
    if (annualDesc)
      annualDesc.textContent = `${c.qty} license${c.qty === 1 ? "" : "s"} · billed monthly`;
    if (annualAmt) annualAmt.textContent = formatMoney(c.monthlySubtotal) + "/mo";
    if (renewalNote)
      renewalNote.textContent = "Billed monthly · next renewal Aug 24, 2026";
  }

  const prorateDesc = $("#prorate-desc");
  const prorateAmt = $("#prorate-amt");
  const totalAmt = $("#total-amt");
  if (prorateDesc)
    prorateDesc.textContent = `Prorated · ${PRORATE_DAYS} days · ${c.qty} license${c.qty === 1 ? "" : "s"}`;
  if (prorateAmt) prorateAmt.textContent = formatMoney(Math.round(c.prorate));
  if (totalAmt) totalAmt.textContent = formatMoney(Math.round(c.prorate));

  // Presets
  $$(".preset").forEach((btn) => {
    const q = Number(btn.dataset.qty);
    btn.classList.toggle("preset-active", q === c.qty);
  });

  // Billing toggle
  $("#bill-monthly")?.classList.toggle("bill-opt-active", state.cycle === "monthly");
  $("#bill-yearly")?.classList.toggle("bill-opt-active", state.cycle === "yearly");
}

function setLicenses(n) {
  state.licenses = clampLicenses(n);
  syncUI();
}

function showScreen(id) {
  const nudge = $("#screen-nudge");
  const checkout = $("#screen-checkout");
  if (id === "checkout") {
    nudge.classList.remove("screen-active");
    nudge.hidden = true;
    checkout.hidden = false;
    checkout.classList.add("screen-active");
    $("#license-input")?.focus();
  } else {
    checkout.classList.remove("screen-active");
    checkout.hidden = true;
    nudge.hidden = false;
    nudge.classList.add("screen-active");
  }
}

function showToast(msg) {
  const toast = $("#toast");
  const text = $("#toast-text");
  if (!toast || !text) return;
  text.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => {
      toast.hidden = true;
    }, 220);
  }, 2800);
}

function init() {
  $("#team-size-label").textContent = String(TEAM_SIZE);
  $("#preset-all").dataset.qty = String(TEAM_SIZE);
  $("#preset-all").textContent = `Entire team (${TEAM_SIZE})`;

  $("#btn-get-now")?.addEventListener("click", () => showScreen("checkout"));
  $("#btn-close-checkout")?.addEventListener("click", () => showScreen("nudge"));

  $("#btn-dec")?.addEventListener("click", () => setLicenses(state.licenses - 1));
  $("#btn-inc")?.addEventListener("click", () => setLicenses(state.licenses + 1));

  const input = $("#license-input");
  input?.addEventListener("input", () => {
    if (input.value === "") return;
    setLicenses(input.value);
  });
  input?.addEventListener("blur", () => {
    if (input.value === "") setLicenses(1);
    else setLicenses(input.value);
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setLicenses(state.licenses + 1);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLicenses(state.licenses - 1);
    }
  });

  $$(".preset").forEach((btn) => {
    btn.addEventListener("click", () => setLicenses(btn.dataset.qty));
  });

  $$(".bill-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cycle = btn.dataset.cycle;
      syncUI();
    });
  });

  $("#btn-add-plan")?.addEventListener("click", () => {
    const btn = $("#btn-add-plan");
    btn.disabled = true;
    btn.textContent = "Adding…";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Add to Plan";
      showToast(
        `${state.licenses} AI Review Assist license${state.licenses === 1 ? "" : "s"} added to your plan`
      );
      showScreen("nudge");
    }, 700);
  });

  syncUI();
}

init();
