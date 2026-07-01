/**
 * Claude Skills Quiz — capture Worker
 * -----------------------------------
 * Receives a completed-quiz payload from the static site and:
 *   1. Logs the lead to KV (so nothing is ever lost, and you can export/import).
 *   2. Upserts the contact in Loops with their quiz result as contact properties.
 *   3. Fires a `quiz_completed` event in Loops, which triggers your email
 *      sequence ("email them when they finish" + any follow-up loops).
 *   4. Tags whether they opted in to How to AI so you can sync those to Substack.
 *
 * How to AI (Substack) note: Substack has no public "add subscriber" API and
 * blocks direct calls (Cloudflare challenge), so we cannot push subscribers
 * straight in. Instead, opted-in leads are flagged here and exported via
 * GET /export?token=... as a CSV you import into Substack (or let Loops sync).
 *
 * Config (set with `wrangler secret put` / vars — see worker/README.md):
 *   LOOPS_API_KEY   (secret)  — enables Loops upsert + event. Omit to just log.
 *   EXPORT_TOKEN    (secret)  — required to hit GET /export.
 *   ALLOWED_ORIGIN  (var)     — e.g. "https://kalmansonshaina.github.io". "*" if unset.
 *   KV binding LEADS          — the lead log.
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // --- CSV export of leads (for Substack import) ---
    if (request.method === "GET" && url.pathname === "/export") {
      if (!env.EXPORT_TOKEN || url.searchParams.get("token") !== env.EXPORT_TOKEN) {
        return json({ ok: false, error: "unauthorized" }, 401, cors);
      }
      const csv = await exportCsv(env);
      return new Response(csv, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="claude-quiz-leads.csv"',
        },
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, cors);
    }

    // --- Capture ---
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, 400, cors);
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) {
      return json({ ok: false, error: "invalid_email" }, 400, cors);
    }

    const lead = {
      email,
      subscribeHowToAI: body.subscribe !== false,
      level: body.level ?? null,
      levelName: body.levelName ?? null,
      score: body.score ?? null,
      gap: body.gap ?? null,
      source: body.source || "claude-skills-quiz",
      answers: body.answers || {},
      ts: body.ts || new Date().toISOString(),
    };

    // 1) Always log to KV first — this is the durable record.
    if (env.LEADS) {
      try {
        await env.LEADS.put("lead:" + email, JSON.stringify(lead));
      } catch (e) {
        // Non-fatal: still try the ESP.
      }
    }

    // 2) + 3) Loops upsert + event (only if configured).
    let loops = { attempted: false };
    if (env.LOOPS_API_KEY) {
      loops = await pushToLoops(env.LOOPS_API_KEY, lead);
    }

    return json({ ok: true, logged: !!env.LEADS, loops }, 200, cors);
  },
};

async function pushToLoops(apiKey, lead) {
  const headers = {
    Authorization: "Bearer " + apiKey,
    "Content-Type": "application/json",
  };

  // Upsert the contact with quiz result as properties. `subscribed` here is the
  // person's overall email consent (they typed their email to get the plan);
  // the How-to-AI opt-in is tracked separately so you can sync it to Substack.
  const contactRes = await safeFetch("https://app.loops.so/api/v1/contacts/update", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: lead.email,
      source: lead.source,
      subscribed: true,
      userGroup: "Claude Skills Quiz",
      // Custom contact properties (create these fields in Loops → Settings → Contacts):
      quizLevel: lead.level,
      quizLevelName: lead.levelName,
      quizScore: lead.score,
      quizGap: lead.gap,
      subscribedHowToAI: lead.subscribeHowToAI,
    }),
  });

  // Fire the event your sequence listens for.
  const eventRes = await safeFetch("https://app.loops.so/api/v1/events/send", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: lead.email,
      eventName: "quiz_completed",
      eventProperties: {
        level: lead.level,
        levelName: lead.levelName,
        score: lead.score,
        gap: lead.gap,
        subscribedHowToAI: lead.subscribeHowToAI,
      },
    }),
  });

  return { attempted: true, contact: contactRes.status, event: eventRes.status };
}

async function safeFetch(u, opts) {
  try {
    const r = await fetch(u, opts);
    return { status: r.status };
  } catch (e) {
    return { status: 0, error: String(e) };
  }
}

async function exportCsv(env) {
  const rows = [["email", "subscribedHowToAI", "level", "levelName", "score", "gap", "ts"]];
  if (env.LEADS) {
    let cursor;
    do {
      const list = await env.LEADS.list({ prefix: "lead:", cursor });
      for (const key of list.keys) {
        const raw = await env.LEADS.get(key.name);
        if (!raw) continue;
        try {
          const l = JSON.parse(raw);
          rows.push([
            l.email,
            l.subscribeHowToAI ? "yes" : "no",
            l.level,
            l.levelName,
            l.score,
            l.gap,
            l.ts,
          ]);
        } catch {}
      }
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
