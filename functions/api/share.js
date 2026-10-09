
const MAX_BODY_BYTES = 100000;
const MAX_RESULT_BYTES = 80000;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const origin = request.headers.get("Origin");
    const allowedOrigin = new URL(request.url).origin;

    if (origin !== allowedOrigin) {
      return jsonResponse({ error: "Forbidden origin" }, 403);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse({ error: "JSON required" }, 415);
    }

    const bodyText = await request.text();

    if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request too large" }, 413);
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const result = body?.result;

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result) ||
      Object.keys(result).length === 0
    ) {
      return jsonResponse({ error: "Invalid result" }, 400);
    }

    if (JSON.stringify(result).length > MAX_RESULT_BYTES) {
      return jsonResponse({ error: "Result too large" }, 413);
    }

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, "");
    const response = await fetch(
      `${supabaseUrl}/rest/v1/band_shared_results`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          id,
          result_data: result,
        }),
      }
    );

    if (!response.ok) {
      console.error("Supabase insert failed:", response.status);
      return jsonResponse({ error: "Could not save result" }, 502);
    }

    return jsonResponse({ id }, 201);
  } catch (error) {
    console.error("Share API error:", error);
    return jsonResponse({ error: "Server error" }, 500);
  }
}
