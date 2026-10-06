// db/seedHelp.js — Phase 22 + §22l. Six topics × four questions, all answers written (the copy is the product).
// Callouts are markdown blockquotes (rendered with a terra left border). `topic` mirrors `category`; `isTopPick`
// marks the five quick-link pills on /help/contact. Reseed replaces the whole set (deleteMany first).
const prisma = require("../config/database");

const HELP_CATEGORIES = [
  { slug: "points-and-balances", name: "Points and balances", icon: "wallet", blurb: "How we read your balances, why one might look wrong, and what we can't see." },
  { slug: "booking-and-payment", name: "Booking and payment", icon: "credit-card", blurb: "What happens when you book, when you're charged, and where your confirmation goes." },
  { slug: "changes-and-cancellations", name: "Changes and cancellations", icon: "calendar-x", blurb: "What Bonza can change, and what you do with the programme directly." },
  { slug: "bonza-pro", name: "Bonza Pro", icon: "crown", blurb: "What Pro includes, how to cancel, and how refunds work." },
  { slug: "bonza-credits", name: "Bonza Credits", icon: "coin", blurb: "Earning, spending and expiry." },
  { slug: "trust-and-security", name: "Trust and security", icon: "shield-lock", blurb: "What we access in your email, what we store, and how to delete your data." },
];

// [topic, slug, title, keywords[], isTopPick, body]
const ARTICLES = [
  // ── Points and balances ──
  ["points-and-balances", "why-is-my-balance-wrong", "Why is my balance wrong?", ["balance", "wrong", "incorrect"], true,
`A balance in Bonza can look off for three reasons:

- **The statement is stale.** We update from your programme's statement emails — if a recent one hasn't arrived, your balance may lag behind the programme's own figure.
- **We can't see that mailbox.** If the statement goes to an address you haven't connected, we won't have read it.
- **A manual override is in place.** If you edited a balance by hand, that figure holds until a newer statement replaces it.

You can check and correct any balance on the **Balance review** page, or add the right figure manually.`],
  ["points-and-balances", "how-bonza-reads-your-balances", "How does Bonza read my balances?", ["email", "read", "sync", "statement"], false,
`Bonza reads your balances from **loyalty-programme statement emails** — with your permission, and read-only. We look only for those statements and take the balance and status from them.

> We never ask for your loyalty passwords and never log in on your behalf. Connecting your email is read-only, and only for statement parsing.

If a balance looks behind, it usually means no recent statement has been sent. You can always add or correct it by hand.`],
  ["points-and-balances", "what-bonza-cannot-see", "What can Bonza not see?", ["cannot", "see", "access"], false,
`Bonza reads statements — it doesn't reach into your accounts. So we can't see:

- **Bookings you made directly** with an airline, hotel or on a programme's site.
- **Pending points** that haven't posted to a statement yet.
- **Tier/credit progress** beyond what a statement shows.

Where a figure can't be verified from a statement, we show it as **your own entry** — clearly marked as yours, never guessed.`],
  ["points-and-balances", "why-a-programme-is-not-listed", "A programme I use isn't listed", ["programme", "missing", "not listed", "add"], false,
`If your programme isn't shown, you can still add it manually in **Points** — enter the balance and we'll track it.

The only difference is that a manually-added balance isn't statement-verified, so we show it as your own entry until we can read a statement for it.`],

  // ── Booking and payment ──
  ["booking-and-payment", "booking-with-points-what-to-expect", "What happens when I book with points?", ["points", "redeem", "programme", "booking"], false,
`> **This is the most important thing to understand about Bonza.**

When you book with points, the redemption completes **on the loyalty programme's own site** — Marriott, BA, Hyatt, and so on. That means:

- The booking **belongs to the programme**, not to Bonza.
- **Bonza can't see, change or cancel it.** We don't hold your points or your programme login, and we have no authority over your account there.

We take you right up to the handoff — finding the best points option and what it's worth — and the programme takes over from there. We'll still **explain your options** and keep a record of what you booked, and we always show you the programme's contact details.`],
  ["booking-and-payment", "what-happens-when-you-book", "What happens when I book with cash?", ["cash", "book", "charge"], false,
`A cash booking completes **on Bonza**. We hold the booking, so we can help you change or cancel it (subject to the provider's rules), and you earn **3% in Bonza Credits**.

Your confirmation comes from us within minutes, and the booking appears on your **Trips** page.`],
  ["booking-and-payment", "where-is-my-confirmation", "Where is my confirmation?", ["confirmation", "email", "receipt"], true,
`For a **cash** booking, your confirmation comes from Bonza within a few minutes of booking — check your inbox (and spam).

For a **points** booking, the confirmation comes from the **programme**, since the redemption completed on their site. It lands in your account with them and in the email they send.`],
  ["booking-and-payment", "when-am-i-charged", "When am I charged?", ["charge", "payment", "when", "billed"], false,
`For a cash booking, you're charged **in full at the time of booking**.

Bonza Pro is billed **annually on your subscription date**. You'll always see the amount before you confirm.`],

  // ── Changes and cancellations ──
  ["changes-and-cancellations", "cancelling-a-bonza-booking", "Can I cancel a booking?", ["cancel", "booking"], true,
`It depends on how it was booked:

- **Cash bookings (made on Bonza)** — we can help you cancel, subject to the airline/hotel/car provider's own rules. Start from your **Trips** page.
- **Points bookings (made on a programme's site)** — only the programme can cancel these. Your Trips page shows which is which, with the programme's contact details.`],
  ["changes-and-cancellations", "cancelling-a-points-booking", "How do I cancel a points booking?", ["cancel", "points", "programme"], false,
`A points booking was made on the programme's own site, so you cancel it **with the programme**. Open the booking on your **Trips** page — we show their contact number and a direct link to manage it.

> Cancellation fees and whether your points are redeposited **vary by programme**. Check with them before you cancel.

We can't make the cancellation for you, but we can explain what to expect and what your points are worth.`],
  ["changes-and-cancellations", "changing-dates", "Can I change my dates?", ["change", "dates", "amend"], false,
`For a **cash** booking, dates can sometimes be changed depending on the fare/rate rules — contact us and we'll look into it.

For a **points** booking, any change is made with the programme directly, under their rules.`],
  ["changes-and-cancellations", "if-your-flight-is-cancelled", "My flight was cancelled", ["flight", "cancelled", "disruption"], false,
`If you're **travelling within 48 hours**, call us rather than email — it's the fastest way to get help when time matters.

Otherwise, raise it from **Contact support** and we'll help you understand your options with the airline.`],

  // ── Bonza Pro ──
  ["bonza-pro", "what-is-included", "What does Pro include?", ["pro", "included", "features"], false,
`Bonza Pro unlocks:

- Cross-leg points/cash optimisation across your whole trip
- Award availability search (Seats.aero)
- Hotel points-redemption comparisons
- Priority personalised recommendations
- Cashback Credits beyond your first booking
- Faster support routing

> Your balances sync on the free plan too — **Pro is about what we do with them**, not whether we read them.`],
  ["bonza-pro", "cancelling-pro", "How do I cancel Pro?", ["cancel", "pro", "subscription"], true,
`Go to **Settings → Pro** and cancel there. You keep Pro access until the end of your current billing period — nothing stops mid-term.`],
  ["bonza-pro", "pro-refunds", "Do I get a refund if I cancel?", ["pro", "refund"], false,
`If you cancel **within 14 days** of a Pro payment, you get a full refund. After that, your Pro access simply continues until your renewal date and doesn't auto-renew.`],
  ["bonza-pro", "what-happens-to-credits-if-i-cancel", "What happens to my Credits if I cancel?", ["credits", "cancel", "pro"], false,
`Your Bonza Credits **stay** — cancelling Pro doesn't remove them. They remain available until their normal expiry date.`],

  // ── Bonza Credits ──
  ["bonza-credits", "how-to-earn-credits", "How do I earn Credits?", ["earn", "credits", "cashback"], false,
`You earn **3% in Bonza Credits** on cash bookings. Your **first** booking earns Credits on any plan; after that, Credits are a **Bonza Pro** benefit.`],
  ["bonza-credits", "spending-credits", "How do I spend Credits?", ["spend", "credits", "use"], false,
`Credits apply **automatically at checkout** on a cash booking, reducing what you pay. You can also put them toward a **Pro renewal**.`],
  ["bonza-credits", "credits-expiry", "When do Credits expire?", ["expiry", "expire", "credits"], true,
`Credits expire **24 months** after they're earned. We warn you before any expire so you have time to use them.`],
  ["bonza-credits", "what-credits-cannot-be-used-for", "Can I withdraw Credits as cash?", ["cash", "withdraw", "credits"], false,
`> **No.** Bonza Credits can't be withdrawn as cash.

They're also **not transferable** to another person or account. They can only be applied to a Bonza cash booking or a Pro renewal.`],

  // ── Trust and security ──
  ["trust-and-security", "what-we-access-in-your-email", "What do you access in my email?", ["email", "access", "gmail", "outlook"], false,
`When you connect Gmail or Outlook, we look only for **loyalty-programme statement emails** from a known list of senders, and read the balance and status from them.

> We don't read your personal correspondence, we don't store the contents of your emails, and we never send email from your account. Access is read-only and you can revoke it at any time.`],
  ["trust-and-security", "what-we-store-and-for-how-long", "What do you store?", ["store", "retention", "data"], false,
`We store your **loyalty balances and statement dates**, your **bookings**, and your **searches** — the things needed to find and manage your trips.

We explicitly do **not** store loyalty passwords, the contents of your emails, or full card numbers (card data is handled by our payment provider).`],
  ["trust-and-security", "disconnecting-your-email", "How do I disconnect my email?", ["disconnect", "revoke", "email"], false,
`Go to **Settings** and disconnect Gmail/Outlook — this revokes our access immediately. Your balances stay as they were last read; we just stop updating them until you reconnect or add figures manually.`],
  ["trust-and-security", "deleting-your-account", "How do I delete my account?", ["delete", "account", "gdpr"], false,
`You can delete your account from **Settings**, or by emailing us. We remove your data within **30 days**, excluding the records we're legally required to keep for completed bookings.`],
];

// Related slugs: within-topic siblings (first two others).
function relatedFor(topic, slug) {
  return ARTICLES.filter((a) => a[0] === topic && a[1] !== slug).slice(0, 2).map((a) => a[1]);
}

async function seedHelp() {
  await prisma.helpArticle.deleteMany({});
  for (const [topic, slug, title, keywords, isTopPick, body] of ARTICLES) {
    const summary = body.replace(/^>.*$/gm, "").replace(/[*_#>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
    const order = ARTICLES.filter((a) => a[0] === topic).findIndex((a) => a[1] === slug) + 1;
    await prisma.helpArticle.create({
      data: { category: topic, topic, slug, title, summary, body, keywords, relatedSlugs: relatedFor(topic, slug), order, isTopPick, isPublished: true },
    });
  }
  console.log(`Seeded ${ARTICLES.length} help articles (6 topics × 4, ${ARTICLES.filter((a) => a[4]).length} top-picks).`);
}

module.exports = { seedHelp, HELP_CATEGORIES };

if (require.main === module) seedHelp().finally(() => prisma.$disconnect());
