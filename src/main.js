/**
 * main.js — Trimble Connect Workspace API Connection
 *
 * Connects to TC Workspace API using the event-callback pattern.
 * All events flow through the connect() callback → dispatched to registered listeners.
 */

import { connect } from "trimble-connect-workspace-api";
import { initObjectExplorer } from "./objectExplorer.js";
import { initSteelStatistics } from "./steelStatistics.js";

// ── State ──
let api = null;
let viewer = null;
const eventListeners = {};

// ── Public API ──
export function getApi() { return api; }
export function getViewer() { return viewer; }

/**
 * Register an event listener for TC Workspace events.
 * Events: "viewer.onModelStateChanged", "viewer.onSelectionChanged", etc.
 */
export function onEvent(eventId, callback) {
  if (!eventListeners[eventId]) eventListeners[eventId] = [];
  eventListeners[eventId].push(callback);
}

function dispatchEvent(eventId, data) {
  const listeners = eventListeners[eventId];
  if (listeners) {
    listeners.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(`[Event ${eventId}] handler error:`, e); }
    });
  }
}

// ── UI Helpers ──
function setConnectionStatus(connected, text) {
  const badge = document.getElementById("connection-status");
  const statusText = badge.querySelector(".status-text");
  badge.className = `status-badge ${connected ? "connected" : "disconnected"}`;
  statusText.textContent = text || (connected ? "Đã kết nối" : "Đang kết nối...");
}

// ── Tab Switching ──
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${tabId}`).classList.add("active");
    });
  });
}

// ── Main Initialization ──
async function init() {
  console.log("[TC Extension] Initializing...");
  initTabs();

  try {
    // Connect with event callback — THE CORRECT WAY for TC Workspace API
    api = await connect(
      window.parent,
      (event, data) => {
        console.log("[TC Event]", event, data);
        dispatchEvent(event, data);
      },
      10000
    );

    viewer = api.viewer;
    setConnectionStatus(true);
    console.log("[TC Extension] Connected to Workspace API");

    // Request permissions
    try {
      await api.extension.requestPermission("accesstoken");
      console.log("[TC Extension] Access token permission granted");
    } catch (e) {
      console.warn("[TC Extension] Permission request failed (may be OK):", e);
    }

    // Initialize feature modules
    initObjectExplorer(api, viewer);
    initSteelStatistics(api, viewer);

    // Log available models
    try {
      const models = await viewer.getModels();
      console.log("[TC Extension] Models loaded:", models);
      if (models && models.length > 0) {
        // Models already loaded, trigger scan
        dispatchEvent("viewer.onModelStateChanged", { models });
      }
    } catch (e) {
      console.warn("[TC Extension] Could not get models:", e);
    }

  } catch (error) {
    console.error("[TC Extension] Connection failed:", error);
    setConnectionStatus(false, "Lỗi kết nối");
  }
}

// ── Start ──
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
