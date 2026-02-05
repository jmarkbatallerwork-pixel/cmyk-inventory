import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("inventory_state")
    .select("data")
    .eq("id", 1)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(data.data);
}
