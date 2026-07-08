/**
 * Seed mock user + demo data for Nexum
 * Usage: npm run seed:mock
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  addDays,
  subDays,
  format,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
} from "date-fns";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  console.error(
    "Add service role key from Supabase Dashboard → Project Settings → API"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const MOCK = {
  email: "max@gmail.com",
  password: "password123",
  fullName: "Max",
};

const today = new Date();
const fmt = (d) => format(d, "yyyy-MM-dd");
const iso = (d) => d.toISOString();

async function getOrCreateUser() {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === MOCK.email);

  if (existing) {
    console.log("User already exists, resetting mock data...");
    await clearUserData(existing.id);
    await supabase
      .from("profiles")
      .update({ full_name: MOCK.fullName, email: MOCK.email })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: MOCK.email,
    password: MOCK.password,
    email_confirm: true,
    user_metadata: { full_name: MOCK.fullName },
  });

  if (error) throw error;
  console.log("Created user:", MOCK.email);
  return data.user.id;
}

async function clearUserData(userId) {
  await supabase.from("finance_transactions").delete().eq("user_id", userId);
  await supabase.from("savings_goals").delete().eq("user_id", userId);
  await supabase.from("wallets").delete().eq("user_id", userId);
  await supabase.from("calendar_events").delete().eq("user_id", userId);
  await supabase.from("notes").delete().eq("user_id", userId);
  await supabase.from("tasks").delete().eq("user_id", userId);
}

function buildTasks(userId) {
  const tasks = [
    { title: "Review Q2 budget report", status: "todo", priority: "high", due: 1, desc: "Check expense categories and variance vs plan" },
    { title: "Prepare client presentation", status: "in_progress", priority: "high", due: 2, desc: "Slides for Thursday meeting with PT Maju Bersama" },
    { title: "Update portfolio website", status: "todo", priority: "medium", due: 5, desc: "Add latest project case studies" },
    { title: "Book annual health checkup", status: "todo", priority: "medium", due: 7, desc: "Call Siloam hospital for appointment" },
    { title: "Pay electricity bill", status: "todo", priority: "high", due: 0, desc: "PLN due today — Rp 450.000" },
    { title: "Team standup notes", status: "done", priority: "low", due: -2, desc: "Summarize blockers from Monday sync" },
    { title: "Fix login bug on staging", status: "done", priority: "high", due: -3, desc: "OAuth redirect issue resolved" },
    { title: "Grocery shopping", status: "todo", priority: "low", due: 1, desc: "Milk, eggs, rice, vegetables, coffee" },
    { title: "Read 'Atomic Habits' ch. 8-10", status: "in_progress", priority: "low", due: 10, desc: "Personal development reading goal" },
    { title: "Submit tax documents", status: "todo", priority: "high", due: 14, desc: "Gather SPT forms and receipts" },
    { title: "Design Nexum dashboard widgets", status: "in_progress", priority: "medium", due: 4, desc: "Sketch stat cards and quick actions layout" },
    { title: "Call mom", status: "todo", priority: "medium", due: 0, desc: "Weekly catch-up call" },
    { title: "Renew domain name", status: "todo", priority: "medium", due: 21, desc: "maxdev.id expires next month" },
    { title: "Organize Downloads folder", status: "done", priority: "low", due: -5, desc: "Sort files into project folders" },
    { title: "Plan weekend trip to Bandung", status: "todo", priority: "low", due: 12, desc: "Hotel, itinerary, and budget" },
    { title: "Write blog post on productivity", status: "todo", priority: "medium", due: 8, desc: "Draft 800 words about task batching" },
    { title: "Backup MacBook to external drive", status: "todo", priority: "high", due: 3, desc: "Time Machine + cloud sync check" },
    { title: "Review insurance policy", status: "in_progress", priority: "medium", due: 18, desc: "Compare health insurance options" },
    { title: "Send invoice to Client A", status: "done", priority: "high", due: -1, desc: "Rp 12.500.000 — project milestone 2" },
    { title: "Morning workout routine", status: "done", priority: "low", due: -1, desc: "30 min run + stretching" },
    { title: "Setup CI/CD pipeline", status: "in_progress", priority: "high", due: 6, desc: "GitHub Actions for auto deploy" },
    { title: "Buy birthday gift for Sarah", status: "todo", priority: "medium", due: 9, desc: "She mentioned wanting a Kindle" },
    { title: "Clean home office desk", status: "done", priority: "low", due: -4, desc: "Cable management and dusting" },
    { title: "Research investment options", status: "todo", priority: "medium", due: 20, desc: "Compare reksadana vs obligasi" },
    { title: "Prepare meal prep for the week", status: "todo", priority: "low", due: 2, desc: "Chicken, rice, and veggies for 5 days" },
    { title: "Fix broken kitchen faucet", status: "todo", priority: "medium", due: 4, desc: "Call plumber or DIY with YouTube guide" },
    { title: "Complete online course module 5", status: "in_progress", priority: "medium", due: 11, desc: "Next.js advanced patterns" },
    { title: "Schedule car service", status: "todo", priority: "low", due: 15, desc: "Oil change at 45.000 km" },
    { title: "Reply to pending emails", status: "done", priority: "medium", due: -2, desc: "12 unread — mostly work related" },
    { title: "Update LinkedIn profile", status: "todo", priority: "low", due: 25, desc: "New role and skills section" },
  ];

  return tasks.map((t, i) => ({
    user_id: userId,
    title: t.title,
    description: t.desc,
    status: t.status,
    priority: t.priority,
    due_date: fmt(addDays(today, t.due)),
    position: i,
  }));
}

function buildNotes(userId) {
  return [
    { title: "Weekly Goals",                  cat: "Personal",  content: "• Finish client presentation\n• Exercise 4x this week\n• Save Rp 2.000.000\n• Read 3 chapters\n• No social media after 9 PM", pinned: true },
    { title: "Meeting Notes — Product Sync",   cat: "Work",      content: "Attendees: Rina, Budi, Max\n\nKey decisions:\n- Launch beta in July\n- Focus on mobile-first UX\n- Budget approved: Rp 85jt\n\nAction items:\n- Max: wireframes by Friday\n- Rina: user research summary", pinned: true },
    { title: "Book Recommendations",           cat: "Learning",  content: "1. Deep Work — Cal Newport\n2. The Psychology of Money\n3. Build — Tony Fadell\n4. Shoe Dog — Phil Knight\n5. Zero to One — Peter Thiel", pinned: false },
    { title: "Grocery List",                   cat: "Personal",  content: "Indomie goreng x5\nBerries\nGreek yogurt\nOlive oil\nChicken breast 1kg\nSpinach\nGarlic\nOat milk", pinned: false },
    { title: "App Ideas",                      cat: "Work",      content: "• Habit tracker with streaks\n• Local restaurant discovery\n• Personal finance dashboard (like Nexum!)\n• Plant watering reminder\n• Study pomodoro with analytics", pinned: false },
    { title: "Travel — Bandung Itinerary",     cat: "Travel",    content: "Day 1: Arrive, check-in hotel, dinner at Sudirman street food\nDay 2: Tangkuban Perahu, Ciwidey strawberry farm\nDay 3: Braga walk, coffee at Kopi Toko Djawa, return\n\nBudget: ~Rp 3.500.000 for 2 people", pinned: false },
    { title: "Password Manager Recovery Codes",cat: "Personal",  content: "Store in safe — backup codes location: home safe drawer #2\n\n(Never store actual passwords in notes!)", pinned: true },
    { title: "Workout Plan",                   cat: "Health",    content: "Mon: Run 5km\nTue: Upper body (push/pull)\nWed: Rest or yoga\nThu: Run 5km\nFri: Lower body\nSat: HIIT 20 min\nSun: Long walk", pinned: false },
    { title: "Quotes to Remember",             cat: "Personal",  content: "\"The secret of getting ahead is getting started.\" — Mark Twain\n\n\"Do not save what is left after spending, but spend what is left after saving.\" — Warren Buffett", pinned: false },
    { title: "Home Improvement Wishlist",      cat: "Personal",  content: "• Standing desk\n• Better monitor arm\n• Air purifier for bedroom\n• Smart lights in living room\n• Bookshelf for office", pinned: false },
    { title: "Client A — Project Scope",       cat: "Work",      content: "Phase 1: Discovery (done)\nPhase 2: Design system (in progress)\nPhase 3: Development\nPhase 4: QA & launch\n\nTotal: Rp 45.000.000 over 3 months", pinned: false },
    { title: "Learning — TypeScript Tips",     cat: "Learning",  content: "• Use discriminated unions for state machines\n• Prefer unknown over any\n• satisfies operator for type narrowing\n• Generic constraints with extends", pinned: false },
    { title: "Random Thoughts",                cat: "Personal",  content: "Should try waking up at 6 AM consistently for a month.\n\nIndonesian coffee culture is underrated — explore more local roasters.", pinned: false },
    { title: "Monthly Review Template",        cat: "Work",      content: "Wins:\n-\n\nLosses/Lessons:\n-\n\nNext month focus:\n1.\n2.\n3.", pinned: false },
    { title: "Gift Ideas",                     cat: "Personal",  content: "Sarah — Kindle / books\nDad — Fishing gear\nMom — Spa voucher\nBudi — Craft beer set", pinned: false },
    { title: "Japan Trip Budget",              cat: "Travel",    content: "Flight: $420 (return)\nHotel 7 nights: $600\nFood daily: $50\nActivities: $300\nSouvenirs: $150\n\nTotal: ~$1,620 (≈ Rp 26jt)\n\nSaving target: $2,000", pinned: false },
    { title: "SQL Cheatsheet",                 cat: "Learning",  content: "SELECT * FROM table WHERE condition\nJOIN ON table.id = other.id\nGROUP BY column HAVING count > 1\nCTE: WITH cte AS (SELECT ...)\nWindow: ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)", pinned: false },
    { title: "Healthy Meal Ideas",             cat: "Health",    content: "Breakfast: Overnight oats + berries\nLunch: Grilled chicken + salad\nDinner: Salmon + steamed veg\nSnack: Greek yogurt + nuts\n\nAvoid: Late night sugar, excessive coffee after 2pm", pinned: false },
  ].map((n) => ({
    user_id: userId,
    title: n.title,
    content: n.content,
    is_pinned: n.pinned,
    category: n.cat ?? "General",
  }));
}

function buildCalendarEvents(userId) {
  const events = [
    { title: "Team Standup", day: 0, hour: 9, dur: 1, color: "#6366f1", desc: "Daily sync with dev team" },
    { title: "Client Call — PT Maju Bersama", day: 1, hour: 14, dur: 2, color: "#ef4444", desc: "Present Q2 progress" },
    { title: "Gym — Upper Body", day: 1, hour: 7, dur: 1, color: "#10b981", desc: "Push day workout" },
    { title: "Dentist Appointment", day: 3, hour: 10, dur: 1, color: "#f59e0b", desc: "Routine cleaning" },
    { title: "Project Deadline — Wireframes", day: 4, hour: 17, dur: 0, color: "#ef4444", desc: "Deliver to design team" },
    { title: "Coffee with Sarah", day: 5, hour: 15, dur: 1, color: "#8b5cf6", desc: "Catch up at Tanamera" },
    { title: "Family Dinner", day: 6, hour: 18, dur: 2, color: "#06b6d4", desc: "Parents' house — bring dessert" },
    { title: "Sprint Planning", day: 7, hour: 10, dur: 2, color: "#6366f1", desc: "Plan next 2-week sprint" },
    { title: "Doctor Checkup", day: 8, hour: 9, dur: 1, color: "#f59e0b", desc: "Annual physical" },
    { title: "Webinar — Next.js 16", day: 9, hour: 19, dur: 2, color: "#6366f1", desc: "Online tech talk" },
    { title: "Car Service", day: 10, hour: 8, dur: 3, color: "#64748b", desc: "Oil change at Toyota service" },
    { title: "Birthday Party — Budi", day: 12, hour: 19, dur: 3, color: "#ec4899", desc: "Restaurant reservation at 7 PM" },
    { title: "1:1 with Manager", day: 14, hour: 11, dur: 1, color: "#6366f1", desc: "Career development discussion" },
    { title: "Weekend Trip — Bandung", day: 15, hour: 6, dur: 48, color: "#10b981", desc: "2-day getaway", allDay: true },
    { title: "Pay Credit Card", day: 17, hour: 10, dur: 0, color: "#ef4444", desc: "BCA card — min payment Rp 1.2jt" },
    { title: "Design Review", day: 18, hour: 14, dur: 1, color: "#6366f1", desc: "Review Nexum UI components" },
    { title: "Yoga Class", day: 20, hour: 7, dur: 1, color: "#10b981", desc: "Studio near Kemang" },
    { title: "Investor Pitch Prep", day: 22, hour: 13, dur: 2, color: "#f59e0b", desc: "Prepare deck and financials" },
    { title: "Team Lunch", day: 24, hour: 12, dur: 1, color: "#06b6d4", desc: "New joiner welcome lunch" },
    { title: "Monthly Budget Review", day: 28, hour: 20, dur: 1, color: "#8b5cf6", desc: "Review spending in Nexum finance" },
    { title: "Haircut", day: -2, hour: 16, dur: 1, color: "#64748b", desc: "Barbershop appointment" },
    { title: "Completed — Project Kickoff", day: -5, hour: 10, dur: 2, color: "#6366f1", desc: "Client A project started" },
    { title: "Movie Night", day: -1, hour: 19, dur: 3, color: "#ec4899", desc: "Dune Part Two at CGV" },
  ];

  return events.map((e) => {
    const start = addDays(today, e.day);
    start.setHours(e.hour, 0, 0, 0);
    const end = e.allDay ? null : addDays(start, 0);
    if (end && e.dur) end.setHours(e.hour + e.dur, 0, 0, 0);
    return {
      user_id: userId,
      title: e.title,
      description: e.desc,
      start_at: iso(start),
      end_at: end ? iso(end) : null,
      all_day: e.allDay ?? false,
      color: e.color,
    };
  });
}

function buildWallets(userId) {
  return [
    { user_id: userId, name: "BCA Savings",    balance: 18500000, currency: "IDR", color: "#6366f1", icon: "wallet" },
    { user_id: userId, name: "GoPay",           balance: 1250000,  currency: "IDR", color: "#10b981", icon: "wallet" },
    { user_id: userId, name: "Cash",            balance: 850000,   currency: "IDR", color: "#f59e0b", icon: "wallet" },
    { user_id: userId, name: "OVO",             balance: 620000,   currency: "IDR", color: "#8b5cf6", icon: "wallet" },
    { user_id: userId, name: "USD Wallet",      balance: 1250,     currency: "USD", color: "#22c55e", icon: "wallet" },
    { user_id: userId, name: "SGD Wallet",      balance: 800,      currency: "SGD", color: "#06b6d4", icon: "wallet" },
  ];
}

function buildSavingsGoals(userId) {
  return [
    { user_id: userId, name: "Emergency Fund",    target_amount: 30000000, current_amount: 18500000, currency: "IDR", exchange_rate: 1.0, deadline: fmt(addDays(today, 180)), color: "#10b981" },
    { user_id: userId, name: "Bandung Trip",       target_amount: 3500000,  current_amount: 2100000,  currency: "IDR", exchange_rate: 1.0, deadline: fmt(addDays(today, 15)),  color: "#6366f1" },
    { user_id: userId, name: "MacBook Pro",        target_amount: 25000000, current_amount: 8200000,  currency: "IDR", exchange_rate: 1.0, deadline: fmt(addDays(today, 120)), color: "#8b5cf6" },
    { user_id: userId, name: "Home Office Setup",  target_amount: 8000000,  current_amount: 4500000,  currency: "IDR", exchange_rate: 1.0, deadline: fmt(addDays(today, 90)),  color: "#f59e0b" },
    { user_id: userId, name: "Japan Vacation",     target_amount: 2000,     current_amount: 650,      currency: "USD", exchange_rate: 16200, deadline: fmt(addDays(today, 240)), color: "#ec4899" },
    { user_id: userId, name: "Investment Fund",    target_amount: 50000000, current_amount: 12000000, currency: "IDR", exchange_rate: 1.0, deadline: fmt(addDays(today, 365)), color: "#a855f7" },
  ];
}

function buildTransactions(userId, walletIds) {
  const [bca, gopay, cash, ovo, usd, sgd] = walletIds;
  const tx = [];

  const incomes = [
    { day: -45, amount: 15000000, cat: "Salary", desc: "Monthly salary — June", wallet: bca },
    { day: -15, amount: 15000000, cat: "Salary", desc: "Monthly salary — July", wallet: bca },
    { day: -30, amount: 3500000, cat: "Freelance", desc: "Client A — milestone payment", wallet: bca },
    { day: -20, amount: 2500000, cat: "Freelance", desc: "Logo design project", wallet: bca },
    { day: -10, amount: 500000, cat: "Gift", desc: "Birthday gift from family", wallet: gopay },
    { day: -5, amount: 1200000, cat: "Investment", desc: "Dividend payout", wallet: bca },
    { day: -2, amount: 800000, cat: "Freelance", desc: "Consulting session", wallet: gopay },
    { day: -10, amount: 350, cat: "Freelance", desc: "USD client payment — design sprint", wallet: usd },
    { day: -25, amount: 200, cat: "Investment", desc: "Dividend — ETF portfolio", wallet: usd },
    { day: -8, amount: 500, cat: "Freelance", desc: "SGD consulting retainer", wallet: sgd },
  ];

  const expenses = [
    { day: -44, amount: 4500000, cat: "Bills", desc: "Rent — apartment", wallet: bca },
    { day: -42, amount: 450000, cat: "Bills", desc: "Electricity (PLN)", wallet: gopay },
    { day: -40, amount: 850000, cat: "Food", desc: "Weekly groceries", wallet: gopay },
    { day: -38, amount: 320000, cat: "Transport", desc: "Grab + petrol", wallet: gopay },
    { day: -35, amount: 1500000, cat: "Shopping", desc: "New running shoes", wallet: bca },
    { day: -33, amount: 275000, cat: "Food", desc: "Restaurants & coffee", wallet: gopay },
    { day: -30, amount: 990000, cat: "Health", desc: "Gym membership — 3 months", wallet: bca },
    { day: -28, amount: 185000, cat: "Transport", desc: "Toll + parking", wallet: cash },
    { day: -25, amount: 650000, cat: "Food", desc: "Groceries", wallet: gopay },
    { day: -22, amount: 1200000, cat: "Bills", desc: "Internet + phone", wallet: bca },
    { day: -20, amount: 450000, cat: "Entertainment", desc: "Netflix + Spotify + games", wallet: gopay },
    { day: -18, amount: 2800000, cat: "Shopping", desc: "Office chair", wallet: bca },
    { day: -16, amount: 175000, cat: "Food", desc: "Lunch deliveries", wallet: gopay },
    { day: -14, amount: 350000, cat: "Health", desc: "Pharmacy & vitamins", wallet: cash },
    { day: -12, amount: 520000, cat: "Food", desc: "Groceries + snacks", wallet: gopay },
    { day: -10, amount: 890000, cat: "Transport", desc: "Car service deposit", wallet: bca },
    { day: -8, amount: 125000, cat: "Food", desc: "Morning coffee runs", wallet: ovo },
    { day: -7, amount: 2100000, cat: "Shopping", desc: "New monitor 27\"", wallet: bca },
    { day: -6, amount: 380000, cat: "Entertainment", desc: "Concert tickets", wallet: gopay },
    { day: -5, amount: 720000, cat: "Food", desc: "Groceries", wallet: gopay },
    { day: -4, amount: 95000, cat: "Transport", desc: "GoRide commutes", wallet: ovo },
    { day: -3, amount: 550000, cat: "Food", desc: "Dinner with friends", wallet: gopay },
    { day: -2, amount: 1800000, cat: "Bills", desc: "Credit card payment", wallet: bca },
    { day: -1, amount: 420000, cat: "Food", desc: "Meal prep ingredients", wallet: gopay },
    { day: 0, amount: 85000, cat: "Food", desc: "Lunch today", wallet: ovo },
    { day: -1, amount: 250000, cat: "Health", desc: "Dentist co-pay", wallet: cash },
    { day: -9, amount: 150000, cat: "Other", desc: "Donation", wallet: gopay },
    { day: -11, amount: 680000, cat: "Shopping", desc: "Books & courses", wallet: bca },
    { day: -13, amount: 195000, cat: "Transport", desc: "Grab to client meeting", wallet: gopay },
    { day: -17, amount: 1100000, cat: "Food", desc: "Family dinner treat", wallet: bca },
    { day: -19, amount: 340000, cat: "Entertainment", desc: "Cinema + snacks", wallet: gopay },
    { day: -21, amount: 780000, cat: "Food", desc: "Groceries", wallet: gopay },
    { day: -23, amount: 4200000, cat: "Bills", desc: "Rent — July", wallet: bca },
    { day: -24, amount: 165000, cat: "Transport", desc: "Parking fees", wallet: cash },
    { day: -26, amount: 890000, cat: "Shopping", desc: "Clothing", wallet: bca },
    { day: -27, amount: 230000, cat: "Food", desc: "Coffee shop work sessions", wallet: gopay },
    { day: -29, amount: 475000, cat: "Bills", desc: "Water bill (PAM)", wallet: gopay },
    { day: -31, amount: 310000, cat: "Health", desc: "Health insurance premium", wallet: bca },
    { day: -34, amount: 560000, cat: "Food", desc: "Groceries", wallet: gopay },
    { day: -36, amount: 1250000, cat: "Shopping", desc: "Birthday gift for Sarah", wallet: bca },
    { day: -37, amount: 98000, cat: "Transport", desc: "TransJakarta + busway", wallet: ovo },
    { day: -39, amount: 750000, cat: "Entertainment", desc: "Gaming subscription + in-app", wallet: gopay },
    { day: -41, amount: 620000, cat: "Food", desc: "Groceries", wallet: gopay },
    { day: -43, amount: 280000, cat: "Other", desc: "Home supplies", wallet: cash },
  ];

  for (const i of incomes) {
    tx.push({
      user_id: userId,
      wallet_id: i.wallet,
      type: "income",
      amount: i.amount,
      category: i.cat,
      description: i.desc,
      transaction_date: fmt(addDays(today, i.day)),
    });
  }

  for (const e of expenses) {
    tx.push({
      user_id: userId,
      wallet_id: e.wallet,
      type: "expense",
      amount: e.amount,
      category: e.cat,
      description: e.desc,
      transaction_date: fmt(addDays(today, e.day)),
    });
  }

  return tx;
}

async function seed() {
  console.log("\n🌱 Seeding Nexum mock data...\n");

  const userId = await getOrCreateUser();

  const tasks = buildTasks(userId);
  const { error: taskErr } = await supabase.from("tasks").insert(tasks);
  if (taskErr) throw taskErr;
  console.log(`✓ ${tasks.length} tasks`);

  const notes = buildNotes(userId);
  const { error: noteErr } = await supabase.from("notes").insert(notes);
  if (noteErr) throw noteErr;
  console.log(`✓ ${notes.length} notes`);

  const events = buildCalendarEvents(userId);
  const { error: eventErr } = await supabase.from("calendar_events").insert(events);
  if (eventErr) throw eventErr;
  console.log(`✓ ${events.length} calendar events`);

  const wallets = buildWallets(userId);
  const { data: walletData, error: walletErr } = await supabase
    .from("wallets")
    .insert(wallets)
    .select("id, currency");
  if (walletErr) throw walletErr;
  console.log(`✓ ${wallets.length} wallets (${wallets.filter(w => w.currency === "IDR").length} IDR + ${wallets.filter(w => w.currency !== "IDR").length} foreign)`);

  const walletIds = walletData.map((w) => w.id);

  const savings = buildSavingsGoals(userId);
  const { error: savingsErr } = await supabase.from("savings_goals").insert(savings);
  if (savingsErr) throw savingsErr;
  console.log(`✓ ${savings.length} savings goals`);

  const transactions = buildTransactions(userId, walletIds);
  const { error: txErr } = await supabase.from("finance_transactions").insert(transactions);
  if (txErr) throw txErr;
  console.log(`✓ ${transactions.length} finance transactions`);

  console.log("\n✅ Mock data seeded successfully!\n");
  console.log("Login credentials:");
  console.log(`  Email   : ${MOCK.email}`);
  console.log(`  Password: ${MOCK.password}`);
  console.log(`  Name    : ${MOCK.fullName}\n`);
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
