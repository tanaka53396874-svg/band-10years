
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

export async function onRequestGet({ params, env }) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const id = params.id;

    // 共有IDは16文字の英数字（小文字の16進数）のみ許可
    if (typeof id !== "string" || !/^[0-9a-f]{16}$/.test(id)) {
      return jsonResponse({ error: "Invalid ID" }, 400);
    }

    const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, "");

    const url = new URL(`${supabaseUrl}/rest/v1/band_shared_results`);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("select", "id,created_at,result_data");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Supabase fetch failed:", response.status);
      return jsonResponse({ error: "Could not load result" }, 502);
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse({ error: "Result not found" }, 404);
    }

    return jsonResponse({
      id: rows[0].id,
      created_at: rows[0].created_at,
      result: rows[0].result_data,
    });
  } catch (error) {
    console.error("Result API error:", error);
    return jsonResponse({ error: "Server error" }, 500);
  }
}
