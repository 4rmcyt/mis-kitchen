import { supabase, q, getCurrentProfile } from './client.js';

export async function saveReport({ sections, nextShift, experimentText, experimentOutcome, experimentNote }) {
  try {
    const profile = await getCurrentProfile();
    const allItems = sections.flatMap(s => s.items);
    const completed_count = allItems.filter(i => i.done).length;
    const total_count     = allItems.length;
    const completed_pct   = total_count > 0
      ? Math.round((completed_count / total_count) * 100) : 0;

    return q(() =>
      supabase.from("daily_reports").upsert({
        user_id:            profile.id,
        restaurant_id:      profile.restaurant_id,
        date:               new Date().toISOString().split("T")[0],
        sections,
        next_shift:         nextShift,
        completed_pct,
        completed_count,
        total_count,
        experiment_text:    experimentText || null,
        experiment_outcome: experimentOutcome || null,
        experiment_note:    experimentNote || null,
      }, { onConflict: "user_id,date" }).select().single()
    );
  } catch (err) {
    console.error("[reports] save:", err.message);
    throw err;
  }
}

export async function getMyReports(limit = 7) {
  return q(() =>
    supabase.from("daily_reports")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit)
  );
}

export async function getRestaurantReports(date) {
  return q(() =>
    supabase.from("daily_reports")
      .select("*, profiles(name, station)")
      .eq("date", date)
      .order("completed_pct", { ascending: false })
  );
}

export async function getStationVelocity(days = 30) {
  const profile = await getCurrentProfile();
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return q(() =>
    supabase.from('station_velocity')
      .select('station,date,total,done_count,pct,day_of_week')
      .eq('restaurant_id', profile.restaurant_id)
      .gte('date', since)
      .order('date', { ascending: false })
  );
}

export async function getShiftExperiment() {
  const profile = await getCurrentProfile();
  const r = await q(() =>
    supabase.from("restaurants")
      .select("shift_experiment")
      .eq("id", profile.restaurant_id)
      .single()
  );
  return r?.shift_experiment ?? null;
}

export async function setShiftExperiment(text) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from("restaurants")
      .update({ shift_experiment: text || null })
      .eq("id", profile.restaurant_id)
  );
}

export async function sendReportEmail(date) {
  try {
    const { data, error } = await supabase.functions.invoke("send-report", {
      body: { date }
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[reports] sendEmail:", err.message);
    throw err;
  }
}
