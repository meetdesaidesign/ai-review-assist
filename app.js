/**
 * Flow: Nudge → Checkout → Billing
 * Assign / manage AI Review Assist lives on Billing, not checkout
 */

const TEAM_SIZE = 100;
const PRICE_PER_LICENSE_MONTH = 9;
const YEARLY_DISCOUNT = 0.2;
const PRORATE_DAYS = 353;
const DAYS_IN_YEAR = 365;

/** Existing plan dollars (from JustCall billing overview mock) */
const BASE_ADDONS = 5148;
const BASE_SUB_TOTAL = 8396;

const TEAM = [
  { id: "meet", name: "Meet Desai", role: "Admin", you: true },
  { id: "priya", name: "Priya Shah", role: "Manager" },
  { id: "alex", name: "Alex Rivera", role: "Manager" },
  { id: "jordan", name: "Jordan Lee", role: "Agent" },
  { id: "sam", name: "Sam Okonkwo", role: "Agent" },
  { id: "nina", name: "Nina Patel", role: "Manager" },
  { id: "chris", name: "Chris Wong", role: "Agent" },
  { id: "taylor", name: "Taylor Kim", role: "Agent" },
];

const state = {
  licenses: 5,
  cycle: "yearly",
  purchased: false,
  assigned: new Set(["meet"]),
  step: "nudge", // nudge | checkout | billing | unlocked
};

const $ = (sel) => document.querySelector(sel);

function clampLicenses(n) {
  const num = Number.parseInt(n, 10);
  if (Number.isNaN(num)) return 1;
  return Math.min(TEAM_SIZE, Math.max(1, num));
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
  const monthlySubtotal = qty * PRICE_PER_LICENSE_MONTH;
  const yearlySubtotal = qty * yearlyRatePerLicense();
  const cardTotal = state.cycle === "yearly" ? yearlySubtotal : monthlySubtotal;
  const prorateBase = state.cycle === "yearly" ? yearlySubtotal : monthlySubtotal * 12;
  const prorate = (prorateBase / DAYS_IN_YEAR) * PRORATE_DAYS;
  const airaYearly = Math.round(yearlySubtotal);
  return { qty, monthlySubtotal, yearlySubtotal, cardTotal, prorate, airaYearly };
}

function syncCheckoutPricing() {
  const c = compute();
  const input = $("#license-input");
  const dec = $("#btn-dec");
  const inc = $("#btn-inc");

  if (input && document.activeElement !== input) input.value = String(c.qty);
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
    const suffix = state.cycle === "yearly" ? "/yr" : "/mo";
    lineSub.textContent = `${c.qty} license${c.qty === 1 ? "" : "s"}${suffix}`;
  }

  const summaryDesc = $("#summary-desc");
  const summaryAmt = $("#summary-amt");
  if (summaryDesc) summaryDesc.textContent = `${c.qty} license${c.qty === 1 ? "" : "s"}`;
  if (summaryAmt) {
    summaryAmt.textContent =
      state.cycle === "yearly"
        ? `${formatMoney(c.yearlySubtotal)}/yr`
        : `${formatMoney(c.monthlySubtotal)}/mo`;
  }

  const totalAmt = $("#total-amt");
  if (totalAmt) totalAmt.textContent = formatMoney(Math.round(c.prorate));

  $("#bill-monthly")?.classList.toggle("bill-opt-active", state.cycle === "monthly");
  $("#bill-yearly")?.classList.toggle("bill-opt-active", state.cycle === "yearly");
}

function syncBillingUI() {
  const c = compute();
  const assigned = state.assigned.size;
  const left = Math.max(0, c.qty - assigned);
  const pct = c.qty ? Math.round((assigned / c.qty) * 100) : 0;

  const addons = BASE_ADDONS + (state.purchased ? c.airaYearly : 0);
  const subTotal = BASE_SUB_TOTAL + (state.purchased ? c.airaYearly : 0);

  const addonsEl = $("#plan-addons-amt");
  const subEl = $("#plan-sub-total");
  if (addonsEl) addonsEl.textContent = formatMoney(addons);
  if (subEl) subEl.textContent = formatMoney(subTotal);

  const amt = $("#aira-manage-amt");
  if (amt) {
    amt.textContent =
      state.cycle === "yearly"
        ? `${formatMoney(c.yearlySubtotal)}/yr`
        : `${formatMoney(c.monthlySubtotal)}/mo`;
  }

  const price = $("#aira-manage-price");
  if (price) {
    price.textContent =
      state.cycle === "yearly"
        ? `$9 / license / month · Yearly (20% off)`
        : `$9 / license / month · Monthly`;
  }

  const lic = $("#aira-stat-licenses");
  if (lic) lic.textContent = String(c.qty);
  const asg = $("#aira-stat-assigned");
  if (asg) asg.textContent = `${assigned} / ${c.qty}`;

  const status = $("#aira-assign-status-label");
  if (status) {
    status.textContent =
      left > 0
        ? `${left} left to assign`
        : "All licenses assigned";
  }

  const fill = $("#aira-progress-fill");
  if (fill) fill.style.width = `${pct}%`;

  const assignBtn = $("#btn-assign-billing");
  if (assignBtn) {
    assignBtn.textContent = left > 0 ? "Assign licenses" : "Manage assignments";
  }

  const billInput = $("#billing-license-input");
  if (billInput && document.activeElement !== billInput) {
    billInput.value = String(c.qty);
  }
  const billDec = $("#btn-bill-dec");
  const billInc = $("#btn-bill-inc");
  if (billDec) billDec.disabled = c.qty <= 1;
  if (billInc) billInc.disabled = c.qty >= TEAM_SIZE;

  const manage = $("#aira-manage");
  if (manage) manage.hidden = !state.purchased;
}

function setLicenses(n) {
  state.licenses = clampLicenses(n);
  if (state.assigned.size > state.licenses) {
    const keep = [...state.assigned].slice(0, state.licenses);
    state.assigned = new Set(keep);
  }
  syncCheckoutPricing();
  syncBillingUI();
  const overlay = $("#assign-overlay");
  if (overlay && !overlay.hidden) syncAssignUI();
}

function setStepIndicators(active) {
  document.querySelectorAll("#checkout-steps .step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.remove("step-done", "step-current");
    el.removeAttribute("aria-current");
    if (n < active) el.classList.add("step-done");
    if (n === active) {
      el.classList.add("step-current");
      el.setAttribute("aria-current", "step");
    }
  });

  document.querySelectorAll("#checkout-steps .step").forEach((el) => {
    const n = Number(el.dataset.step);
    const dot = el.querySelector(".step-dot");
    if (!dot) return;
    if (n < active) {
      dot.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
    } else {
      dot.textContent = String(n);
    }
  });
}

function hideAllScreens() {
  ["#screen-nudge", "#screen-checkout", "#screen-billing"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.classList.remove("screen-active");
    el.hidden = true;
  });
}

function showScreen(id) {
  hideAllScreens();
  state.step = id;

  if (id === "nudge" || id === "unlocked") {
    const nudge = $("#screen-nudge");
    nudge.hidden = false;
    nudge.classList.add("screen-active");
    return;
  }

  if (id === "checkout") {
    const checkout = $("#screen-checkout");
    checkout.hidden = false;
    checkout.classList.add("screen-active");
    $("#checkout-title").textContent = "Checkout";
    setStepIndicators(2);
    $("#license-input")?.focus();
    return;
  }

  if (id === "billing") {
    const billing = $("#screen-billing");
    billing.hidden = false;
    billing.classList.add("screen-active");
    syncBillingUI();
  }
}

function openAssignSheet() {
  if (!state.assigned.has("meet") && state.assigned.size < state.licenses) {
    state.assigned.add("meet");
  }

  const overlay = $("#assign-overlay");
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("assign-overlay-open"));
  syncAssignUI();
  $("#user-search")?.focus();
}

function closeAssignSheet({ toast } = {}) {
  const overlay = $("#assign-overlay");
  overlay.classList.remove("assign-overlay-open");
  setTimeout(() => {
    overlay.hidden = true;
  }, 200);

  syncAssignReminder();
  syncBillingUI();

  if (toast) {
    showToast(
      state.assigned.size
        ? `Assigned to ${state.assigned.size} user${state.assigned.size === 1 ? "" : "s"}`
        : "No licenses assigned yet"
    );
  }
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function syncAssignUI() {
  const q = ($("#user-search")?.value || "").trim().toLowerCase();
  const list = $("#user-list");
  const selected = state.assigned.size;
  const max = state.licenses;

  $("#assign-count").innerHTML = `<strong>${selected}</strong> / ${max}`;

  const left = max - selected;
  const sub = $("#assign-sub");
  if (sub) {
    sub.textContent =
      left > 0
        ? `${left} license${left === 1 ? "" : "s"} left to assign`
        : "All licenses assigned";
  }

  const filtered = TEAM.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
  );

  list.innerHTML = filtered
    .map((u) => {
      const on = state.assigned.has(u.id);
      const atCap = !on && selected >= max;
      return `
      <li>
        <label class="user-row ${on ? "user-row-on" : ""} ${atCap ? "user-row-disabled" : ""}">
          <input type="checkbox" data-id="${u.id}" ${on ? "checked" : ""} ${atCap ? "disabled" : ""} />
          <span class="user-avatar" aria-hidden="true">${initials(u.name)}</span>
          <span class="user-meta">
            <span class="user-name">${u.name}${u.you ? ' <em>you</em>' : ""}</span>
            <span class="user-role">${u.role}</span>
          </span>
        </label>
      </li>`;
    })
    .join("");

  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (state.assigned.size >= state.licenses) {
          cb.checked = false;
          return;
        }
        state.assigned.add(id);
      } else {
        state.assigned.delete(id);
      }
      syncAssignUI();
      syncBillingUI();
    });
  });
}

function syncAssignReminder() {
  const left = state.licenses - state.assigned.size;
  const reminder = $("#assign-reminder");
  if (!reminder) return;
  if (state.purchased && left > 0) {
    reminder.hidden = false;
    $("#assign-reminder-text").textContent = `${left} license${left === 1 ? "" : "s"} unassigned`;
  } else {
    reminder.hidden = true;
  }
}

/** Unlock call features in the background so Dashboard return shows them */
function applyPurchaseToCall() {
  $("#nudge-locked").hidden = true;
  $("#insights-live").hidden = false;

  $("#lock-questions")?.remove();
  $("#lock-sentiment")?.remove();

  $("#questions-stats").innerHTML = `
    <div class="stat-row"><span>Asked by Customer</span><span class="stat-val">3</span></div>
    <div class="stat-row"><span>Asked by Agent</span><span class="stat-val">5</span></div>`;

  $("#sentiment-stats").innerHTML = `
    <div class="stat-row"><span>Positive</span><span class="stat-val">4</span></div>
    <div class="stat-row"><span>Negative</span><span class="stat-val">1</span></div>`;

  const ask = $("#btn-ask-ai");
  if (ask) {
    ask.disabled = false;
    ask.removeAttribute("title");
  }

  const search = $("#search-bar");
  if (search) {
    search.classList.remove("search-locked");
    search.classList.add("search-open");
    search.removeAttribute("title");
    $("#search-placeholder").textContent = "Search transcript…";
  }

  syncAssignReminder();
}

function goToBillingAfterPurchase() {
  state.purchased = true;
  if (!state.assigned.has("meet")) state.assigned.add("meet");
  applyPurchaseToCall();
  showScreen("billing");
  syncBillingUI();

  // Highlight manage card
  const card = $("#aira-manage");
  card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  }, 2600);
}

function init() {
  const teamLabel = $("#team-size-label");
  if (teamLabel) teamLabel.textContent = String(TEAM_SIZE);
  const billTeam = $("#billing-team-size");
  if (billTeam) billTeam.textContent = String(TEAM_SIZE);

  $("#btn-get-now")?.addEventListener("click", () => showScreen("checkout"));

  $("#btn-close-checkout")?.addEventListener("click", () => {
    if (state.purchased) showScreen("billing");
    else showScreen("nudge");
  });

  $("#btn-back-dashboard")?.addEventListener("click", () => {
    showScreen("unlocked");
  });

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

  document.querySelectorAll(".bill-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.cycle = btn.dataset.cycle;
      syncCheckoutPricing();
      syncBillingUI();
    });
  });

  $("#btn-add-plan")?.addEventListener("click", () => {
    try {
      goToBillingAfterPurchase();
      showToast(
        `${state.licenses} AI Review Assist license${state.licenses === 1 ? "" : "s"} added to your plan`
      );
    } catch (err) {
      console.error("Add to Plan failed:", err);
      showToast("Something went wrong adding to your plan");
    }
  });

  $("#user-search")?.addEventListener("input", syncAssignUI);

  $("#btn-confirm-assign")?.addEventListener("click", () => {
    closeAssignSheet({ toast: true });
  });

  $("#btn-close-assign")?.addEventListener("click", () => closeAssignSheet());
  $("#assign-backdrop")?.addEventListener("click", () => closeAssignSheet());

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const overlay = $("#assign-overlay");
    if (overlay && !overlay.hidden) closeAssignSheet();
  });

  $("#btn-assign-later")?.addEventListener("click", openAssignSheet);
  $("#btn-assign-billing")?.addEventListener("click", openAssignSheet);

  $("#btn-scroll-addons")?.addEventListener("click", () => {
    $("#aira-manage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#btn-edit-licenses")?.addEventListener("click", () => {
    const panel = $("#aira-edit-qty");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) $("#billing-license-input")?.focus();
  });

  $("#btn-bill-dec")?.addEventListener("click", () => setLicenses(state.licenses - 1));
  $("#btn-bill-inc")?.addEventListener("click", () => setLicenses(state.licenses + 1));

  const billInput = $("#billing-license-input");
  billInput?.addEventListener("input", () => {
    if (billInput.value === "") return;
    setLicenses(billInput.value);
  });
  billInput?.addEventListener("blur", () => {
    if (billInput.value === "") setLicenses(1);
    else setLicenses(billInput.value);
  });

  $("#btn-save-licenses")?.addEventListener("click", () => {
    setLicenses($("#billing-license-input")?.value || state.licenses);
    $("#aira-edit-qty").hidden = true;
    showToast(`Updated to ${state.licenses} license${state.licenses === 1 ? "" : "s"}`);
  });

  $("#btn-remove-aira")?.addEventListener("click", () => {
    const ok = window.confirm("Remove AI Review Assist from your plan?");
    if (!ok) return;
    state.purchased = false;
    state.assigned = new Set(["meet"]);
    syncBillingUI();
    showToast("AI Review Assist removed from your plan");
  });

  document.querySelectorAll(".billing-nav-item").forEach((a) => {
    a.addEventListener("click", (e) => e.preventDefault());
  });

  syncCheckoutPricing();
  syncBillingUI();
}

init();
