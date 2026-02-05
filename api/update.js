import { createClient } from "@supabase/supabase-js";

function stamp() {
  return new Date().toLocaleString("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true
})

}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { pin, color, action, amount } = req.body || {};

  if (!pin || !color || !action || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Load current state
  const { data: row, error: readErr } = await supabase
    .from("inventory_state")
    .select("data")
    .eq("id", 1)
    .single();

  if (readErr) return res.status(500).json({ error: readErr.message });

  const state = row.data;

  const userName = state.users?.[pin];
  if (!userName) return res.status(401).json({ error: "Invalid PIN" });

  if (!["C", "M", "Y", "K"].includes(color)) {
    return res.status(400).json({ error: "Invalid color" });
  }
  if (!["add", "reduce"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const before = Number(state.stock?.[color] ?? 0);
  const after = action === "add" ? before + amt : before - amt;

  if (after < 0) return res.status(400).json({ error: "Cannot reduce below 0" });

  state.stock[color] = after;
  state.history = Array.isArray(state.history) ? state.history : [];

  state.history.unshift({
    date: stamp(),
    user: userName,
    color,
    action,
    amount: amt,
    before,
    after
  });

  // optional: limit history
  if (state.history.length > 300) state.history.length = 300;

  // Save back
  const { error: writeErr } = await supabase
    .from("inventory_state")
    .update({ data: state, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (writeErr) return res.status(500).json({ error: writeErr.message });

  res.status(200).json(state);
}

