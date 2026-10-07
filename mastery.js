"use strict";
var __MasteryBoot = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // web/src/app/domain/mastery.boot.ts
  var mastery_boot_exports = {};
  __export(mastery_boot_exports, {
    createApi: () => createApi
  });

  // web/src/app/domain/mastery.ts
  var DAY = 24 * 60 * 60 * 1e3;
  var own = (o, k) => Object.hasOwn(o, k);
  var emptySkill = () => ({
    status: "learning",
    practice: 0,
    practiceScore: 0,
    history: [],
    cycle: null,
    proof: null
  });
  function createTacticalMastery(C) {
    function create(legacy = null) {
      return {
        version: 2,
        skills: {},
        exposure: { ids: {}, positions: {} },
        pending: null,
        session: null,
        reviewQueue: [],
        recent: [],
        diagnostic: { done: [], recommendations: [] },
        remediation: { origin: null, checks: [], gaps: [] },
        legacyRating: Number.isFinite(legacy?.rating) ? legacy.rating : null,
        enabled: true
      };
    }
    function valid(p) {
      if (!p || typeof p !== "object" || p.version !== 2 || !p.skills || typeof p.skills !== "object" || Array.isArray(p.skills) || !p.exposure?.ids || !p.exposure.positions || !Array.isArray(p.reviewQueue) || !Array.isArray(p.recent) || !Array.isArray(p.diagnostic?.done) || !Array.isArray(p.diagnostic.recommendations)) {
        return false;
      }
      const profile = p;
      const map = (o) => o && typeof o === "object" && !Array.isArray(o);
      if (!map(profile.exposure.ids) || !map(profile.exposure.positions)) return false;
      if (profile.remediation && (!Array.isArray(profile.remediation.checks) || !Array.isArray(profile.remediation.gaps) || ![...profile.remediation.checks, ...profile.remediation.gaps].every((id) => C.byId[id]))) {
        return false;
      }
      const answer2 = (a) => !!a && typeof a === "object" && typeof a.correct === "boolean" && Number.isFinite(a.at) && typeof a.position === "string" && typeof a.id === "string";
      for (const [id, s] of Object.entries(profile.skills)) {
        if (!C.byId[id] || !["learning", "mastered", "remediation"].includes(s?.status) || !Number.isInteger(s.practice) || s.practice < 0 || !Number.isFinite(s.practiceScore) || s.practiceScore < 0 || s.practiceScore > s.practice || !Array.isArray(s.history) || !s.history.every(answer2)) {
          return false;
        }
        if (s.status === "mastered" && (!s.proof || s.proof.count !== 20 || !Number.isInteger(s.proof.correct) || s.proof.correct < 18 || s.proof.correct > 20 || !Number.isFinite(s.proof.completedAt) || !Number.isFinite(s.proof.firstCompletedAt) || s.proof.completedAt - s.proof.firstCompletedAt < DAY)) {
          return false;
        }
        const c = s.cycle;
        if (c && (!["active", "waiting", "passed", "failed", "interrupted"].includes(c.state) || !["mastery", "maintenance"].includes(c.kind) || typeof c.id !== "string" || !Array.isArray(c.answers) || !c.answers.every(answer2) || c.answers.length > 20 || ![1, 2].includes(c.phase) || c.firstCompletedAt !== null && !Number.isFinite(c.firstCompletedAt))) {
          return false;
        }
      }
      if (profile.session) {
        const session = profile.session;
        if (!["active", "complete", "blocked", "remediation"].includes(session.state) || !Array.isArray(session.slots) || !session.slots.length || !map(session.counts) || !Array.isArray(session.results)) {
          return false;
        }
        if (!session.slots.every(
          (s) => C.byId[s.id] && ["mastery", "maintenance"].includes(s.kind) && Number.isInteger(s.quota) && s.quota >= 1 && s.quota <= 10
        )) {
          return false;
        }
        if (new Set(session.slots.map((s) => s.id)).size !== session.slots.length) return false;
        if (!Object.entries(session.counts).every(
          ([sid, n]) => session.slots.some((s) => s.id === sid && Number.isInteger(n) && n >= 0 && n <= s.quota)
        )) {
          return false;
        }
        if (!session.results.every(
          (r) => C.byId[r.skillId] && typeof r.correct === "boolean" && Array.isArray(r.solution) && Array.isArray(r.line)
        )) {
          return false;
        }
        if (session.state === "complete" && !session.slots.every((s) => session.counts[s.id] === s.quota)) {
          return false;
        }
      }
      if (profile.pending && (!C.byId[profile.pending.skillId] || !["mastery", "maintenance", "diagnostic"].includes(profile.pending.kind) || !profile.pending.puzzle || typeof profile.pending.puzzle.id !== "string" || typeof profile.pending.position !== "string" || !Array.isArray(profile.pending.line) || profile.pending.line.length > 15 || profile.pending.draft !== void 0 && typeof profile.pending.draft !== "string" || !profile.pending.line.every(
        (m) => typeof m === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)
      ))) {
        return false;
      }
      return true;
    }
    function state(p, id) {
      return own(p.skills, id) ? p.skills[id] : emptySkill();
    }
    function writable(p, id) {
      if (!C.byId[id]) throw Error("Unknown skill");
      if (!own(p.skills, id)) p.skills[id] = emptySkill();
      return p.skills[id];
    }
    function mastered(p, id) {
      return state(p, id).status === "mastered";
    }
    function unlocked(p, step) {
      return C.skills.filter((s) => s.step < step && s.required).every((s) => mastered(p, s.id));
    }
    function activeStep(p) {
      return [1, 2, 3, 4, 5, 6].find((n) => !C.stepSkills(n).every((s) => mastered(p, s.id))) || 6;
    }
    function blockers(p, id, visited = /* @__PURE__ */ new Set()) {
      if (visited.has(id) || !C.byId[id]) return [];
      visited.add(id);
      const unmet = C.byId[id].prerequisites.filter((k) => !mastered(p, k));
      return unmet.flatMap((k) => {
        const deeper = blockers(p, k, visited);
        return deeper.length ? deeper : [k];
      });
    }
    function target(p, id) {
      if (!C.byId[id]) return null;
      const bases = blockers(p, id);
      if (bases.length) return bases[0];
      if (!unlocked(p, C.byId[id].step)) {
        return C.stepSkills(activeStep(p)).find((s) => !mastered(p, s.id) && !blockers(p, s.id).length)?.id || null;
      }
      return id;
    }
    function exposed(p, item) {
      return own(p.exposure.ids, item.puzzle.id) || own(p.exposure.positions, item.position);
    }
    function expose(p, item, kind) {
      p.exposure.ids[item.puzzle.id] = kind;
      p.exposure.positions[item.position] = kind;
    }
    function fresh(p, bank, id) {
      const seen = /* @__PURE__ */ new Set();
      return bank.filter((b) => {
        if (!b.eligible || !b.skills.includes(id) || exposed(p, b) || seen.has(b.position)) {
          return false;
        }
        seen.add(b.position);
        return true;
      });
    }
    function coverage(p, bank, id) {
      const s = state(p, id);
      const c = s.cycle;
      const needed = c && ["active", "waiting"].includes(c.state) ? (c.kind === "maintenance" ? 10 : 20) - c.answers.length : 20;
      return {
        available: fresh(p, bank, id).length,
        needed,
        training: bank.filter((b) => b.skills.includes(id) || b.candidates.includes(id)).length
      };
    }
    function choosePractice(p, bank, id = null, random = Math.random) {
      const current = C.stepSkills(activeStep(p)).filter((s) => !mastered(p, s.id) && !blockers(p, s.id).length).map((s) => s.id);
      const maintenance = C.skills.filter((s) => mastered(p, s.id) && !blockers(p, s.id).length).map((s) => s.id);
      let choices;
      if (id) choices = [target(p, id)].filter((x) => Boolean(x));
      else choices = maintenance.length && random() < 0.2 ? maintenance : current;
      if (!choices.length) choices = current;
      choices.sort(
        (a, b) => Number(p.diagnostic.recommendations.includes(b)) - Number(p.diagnostic.recommendations.includes(a)) || state(p, a).practice - state(p, b).practice
      );
      for (const skill of choices) {
        const reserve = new Set(
          C.skills.flatMap(
            (s) => fresh(p, bank, s.id).slice(0, Math.max(20, coverage(p, bank, s.id).needed)).map((b) => b.position)
          )
        );
        let pool = bank.filter(
          (b) => (b.skills.includes(skill) || b.candidates.includes(skill)) && !reserve.has(b.position)
        );
        const recent = pool.filter((b) => !p.recent.includes(b.puzzle.id));
        if (recent.length) pool = recent;
        if (!pool.length) continue;
        const rating = p.practiceRating ?? p.legacyRating;
        if (Number.isFinite(rating)) {
          pool.sort(
            (a, b) => Math.abs((a.puzzle.rating || rating) - rating + 100) - Math.abs((b.puzzle.rating || rating) - rating + 100)
          );
        }
        const item = pool[Math.floor(random() * Math.min(pool.length, 5))];
        expose(p, item, "practice");
        p.recent = [...p.recent.filter((k) => k !== item.puzzle.id), item.puzzle.id].slice(-30);
        return { item, skill, maintenance: mastered(p, skill) };
      }
      return null;
    }
    function practiceResult(p, id, score) {
      const s = writable(p, id);
      s.practice++;
      s.practiceScore += Math.max(0, Math.min(1, score));
    }
    function prerequisiteChecks(p) {
      return (p.remediation?.checks || []).filter((sid) => mastered(p, sid));
    }
    function start(p, bank, id, now = Date.now(), kind = "mastery") {
      if (p.pending) return { ok: false, reason: "pending" };
      if (!C.byId[id] || !unlocked(p, C.byId[id].step) || blockers(p, id).length) {
        return { ok: false, reason: "locked" };
      }
      if (kind === "mastery" && p.remediation?.origin === id && prerequisiteChecks(p).length) {
        return { ok: false, reason: "prerequisites-check" };
      }
      const s = writable(p, id);
      if (kind === "maintenance" && !mastered(p, id)) return { ok: false, reason: "locked" };
      if (kind === "mastery" && mastered(p, id)) return { ok: false, reason: "mastered" };
      let c = s.cycle;
      if (c && ["active", "waiting"].includes(c.state) && c.kind !== kind) {
        return { ok: false, reason: "active-cycle" };
      }
      if (c?.state === "waiting") {
        const until = c.firstCompletedAt + DAY;
        if (now < until) return { ok: false, reason: "waiting", until };
        c.phase = 2;
        c.state = "active";
      }
      if (!c || !["active", "waiting"].includes(c.state)) {
        const needed = kind === "maintenance" ? 10 : 20;
        if (fresh(p, bank, id).length < needed) {
          return {
            ok: false,
            reason: "insufficient",
            available: fresh(p, bank, id).length,
            needed
          };
        }
        c = {
          id: `${id}:${now}:${s.history.length}`,
          kind,
          state: "active",
          phase: 1,
          answers: [],
          firstCompletedAt: null
        };
        s.cycle = c;
      }
      return next(p, bank, id, now);
    }
    function next(p, bank, id, now = Date.now()) {
      if (p.pending) return { ok: false, reason: "pending" };
      const c = state(p, id).cycle;
      if (!c || c.state !== "active") return { ok: false, reason: c?.state || "no-cycle" };
      const item = fresh(p, bank, id)[0];
      if (!item) {
        return {
          ok: false,
          reason: "insufficient",
          available: 0,
          needed: (c.kind === "maintenance" ? 10 : 20) - c.answers.length
        };
      }
      expose(p, item, "assessment");
      p.pending = {
        kind: c.kind,
        skillId: id,
        cycleId: c.id,
        puzzle: item.puzzle,
        position: item.position,
        line: [],
        startedAt: now
      };
      return { ok: true, item, pending: p.pending };
    }
    function sessionReady(p, bank, id, kind, now) {
      const s = state(p, id);
      const c = s.cycle;
      if (!unlocked(p, C.byId[id].step) || blockers(p, id).length) return false;
      if (kind === "mastery" && p.remediation?.origin === id && prerequisiteChecks(p).length) {
        return false;
      }
      if (c?.state === "waiting" && now < c.firstCompletedAt + DAY) return false;
      if (c && ["active", "waiting"].includes(c.state) && c.kind !== kind) return false;
      const need = c && c.state === "active" ? 1 : c && c.state === "waiting" ? (kind === "maintenance" ? 10 : 20) - c.answers.length : kind === "maintenance" ? 10 : 20;
      return fresh(p, bank, id).length >= need;
    }
    function startSession(p, bank, step = activeStep(p), now = Date.now(), random = Math.random, skillId = null) {
      if (p.pending) return { ok: false, reason: "pending" };
      if (p.session?.state === "active") return nextSession(p, bank, now, random);
      const checks = prerequisiteChecks(p);
      const focused = skillId && C.byId[skillId] ? [C.byId[skillId]] : null;
      const primary = (checks.length ? checks.map((sid) => C.byId[sid]) : focused || C.stepSkills(step)).filter((s) => !blockers(p, s.id).length && unlocked(p, s.step));
      let slots = primary.map((s) => ({ id: s.id, kind: mastered(p, s.id) ? "maintenance" : "mastery", quota: 10 })).filter((s) => sessionReady(p, bank, s.id, s.kind, now));
      if (!slots.length) {
        const waiting = primary.map((s) => state(p, s.id).cycle).filter((c) => c?.state === "waiting" && now < c.firstCompletedAt + DAY);
        if (waiting.length) {
          return { ok: false, reason: "waiting", until: Math.min(...waiting.map((c) => c.firstCompletedAt + DAY)) };
        }
        return { ok: false, reason: unlocked(p, step) ? "insufficient" : "locked" };
      }
      slots = slots.map((s) => {
        const c = state(p, s.id).cycle;
        return {
          ...s,
          quota: c && c.state === "active" ? 10 - c.answers.length % 10 : 10
        };
      });
      const primaryCount = slots.reduce((n, s) => n + s.quota, 0);
      if (!focused && !checks.length && slots.some((s) => s.kind === "mastery")) {
        const older = C.skills.filter(
          (s) => s.step < step && mastered(p, s.id) && sessionReady(p, bank, s.id, "maintenance", now)
        );
        if (older.length) {
          const s = older[Math.floor(random() * older.length)];
          slots.push({
            id: s.id,
            kind: "maintenance",
            quota: Math.min(10, Math.round(primaryCount / 4))
          });
        }
      }
      p.session = { state: "active", step: focused ? focused[0].step : step, slots, counts: {}, results: [], startedAt: now };
      return nextSession(p, bank, now, random);
    }
    function nextSession(p, bank, now = Date.now(), random = Math.random) {
      if (p.pending) return { ok: false, reason: "pending" };
      const session = p.session;
      if (!session || session.state !== "active") return { ok: false, reason: "no-session" };
      const slots = session.slots.filter(
        (s) => (session.counts[s.id] || 0) < s.quota && sessionReady(p, bank, s.id, s.kind, now)
      );
      if (!slots.length) {
        session.state = "blocked";
        return { ok: false, reason: "insufficient" };
      }
      const chosen = slots[Math.floor(random() * slots.length)];
      return start(p, bank, chosen.id, now, chosen.kind);
    }
    function diagnose(p, bank, now = Date.now()) {
      if (p.pending) return { ok: false, reason: "pending" };
      for (const s of C.skills) {
        if (p.diagnostic.done.includes(s.id)) continue;
        const available = fresh(p, bank, s.id);
        if (available.length <= 20) continue;
        const item = available[20];
        expose(p, item, "diagnostic");
        p.pending = {
          kind: "diagnostic",
          skillId: s.id,
          puzzle: item.puzzle,
          position: item.position,
          line: [],
          startedAt: now
        };
        return { ok: true, item, pending: p.pending };
      }
      return { ok: false, reason: "insufficient" };
    }
    function answer(p, outcome, now = Date.now()) {
      const pending = p.pending;
      if (!pending) return { ok: false, reason: "no-pending" };
      if (!["correct", "wrong", "skip", "unknown"].includes(outcome)) throw Error("Invalid outcome");
      p.pending = null;
      if (outcome === "unknown") {
        p.reviewQueue.push({
          id: pending.puzzle.id,
          sourceId: pending.puzzle.sourceId || pending.puzzle.id,
          position: pending.position,
          skillId: pending.skillId,
          at: now,
          line: pending.line,
          reason: pending.verificationFailure || "ungraded"
        });
        return { ok: true, state: "unknown", skillId: pending.skillId };
      }
      const correct = outcome === "correct";
      if (p.session?.state === "active" && pending.kind !== "diagnostic") {
        const session = p.session;
        session.counts[pending.skillId] = (session.counts[pending.skillId] || 0) + 1;
        session.results.push({
          id: pending.puzzle.id,
          skillId: pending.skillId,
          correct,
          outcome,
          line: pending.line,
          solution: pending.puzzle.solution || []
        });
        if (session.slots.every((s2) => (session.counts[s2.id] || 0) >= s2.quota)) {
          session.state = "complete";
        }
      }
      if (pending.kind === "diagnostic") {
        p.diagnostic.done.push(pending.skillId);
        if (!correct && !p.diagnostic.recommendations.includes(pending.skillId)) {
          p.diagnostic.recommendations.push(pending.skillId);
        }
        return { ok: true, state: "diagnostic", correct, skillId: pending.skillId };
      }
      const s = writable(p, pending.skillId);
      const c = s.cycle;
      if (!c || c.id !== pending.cycleId || c.state !== "active") {
        return { ok: false, reason: "stale" };
      }
      const a = { correct, at: now, id: pending.puzzle.id, position: pending.position, outcome };
      c.answers.push(a);
      s.history.push(a);
      if (s.history.length > 300) s.history = s.history.slice(-300);
      if (c.kind === "maintenance") {
        const last = s.history.slice(-10);
        if (last.length === 10 && last.filter((x) => x.correct).length < 8) {
          s.status = "remediation";
          c.state = "interrupted";
          if (p.session) p.session.state = "remediation";
          const plan = p.remediation || { origin: null, checks: [], gaps: [] };
          if (!plan.origin) plan.origin = pending.skillId;
          plan.checks = [
            .../* @__PURE__ */ new Set([
              ...plan.checks.filter((sid) => sid !== pending.skillId),
              ...C.byId[pending.skillId].prerequisites.filter((sid) => mastered(p, sid))
            ])
          ];
          if (!plan.gaps.includes(pending.skillId)) plan.gaps.push(pending.skillId);
          p.remediation = plan;
          return { ok: true, state: "remediation", correct, skillId: pending.skillId };
        }
        if (c.answers.length === 10) {
          c.state = "passed";
          if (p.remediation) {
            p.remediation.checks = p.remediation.checks.filter((sid) => sid !== pending.skillId);
          }
        }
        return { ok: true, state: c.state, correct, skillId: pending.skillId };
      }
      if (c.answers.length === 10) {
        c.firstCompletedAt = now;
        c.state = "waiting";
      }
      if (c.answers.length === 20) {
        const passed = c.answers.filter((x) => x.correct).length >= 18;
        c.state = passed ? "passed" : "failed";
        if (passed) {
          s.proof = {
            cycleId: c.id,
            count: 20,
            correct: c.answers.filter((x) => x.correct).length,
            firstCompletedAt: c.firstCompletedAt,
            completedAt: now
          };
        }
        s.status = passed ? "mastered" : s.status === "remediation" ? "remediation" : "learning";
        if (passed && p.remediation) {
          p.remediation.gaps = p.remediation.gaps.filter((sid) => sid !== pending.skillId);
          if (p.remediation.origin === pending.skillId) {
            p.remediation = { origin: null, checks: [], gaps: [] };
          }
        }
      }
      return { ok: true, state: c.state, correct, skillId: pending.skillId };
    }
    return {
      DAY,
      create,
      valid,
      state,
      mastered,
      unlocked,
      activeStep,
      blockers,
      target,
      exposed,
      fresh,
      coverage,
      prerequisiteChecks,
      choosePractice,
      practiceResult,
      start,
      next,
      startSession,
      nextSession,
      diagnose,
      answer
    };
  }

  // web/src/app/domain/mastery.boot.ts
  function createApi(C) {
    return createTacticalMastery({
      skills: C.skills,
      byId: C.byId,
      stepSkills: (step) => C.stepSkills(step)
    });
  }
  return __toCommonJS(mastery_boot_exports);
})();

(function (root) {
  const C =
    typeof module !== 'undefined' && module.exports
      ? require('./curriculum.js')
      : root.ChessCurriculum;
  const api = __MasteryBoot.createApi(C);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TacticalMastery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
