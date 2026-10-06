// db/seedProgrammeContacts.js — Phase 22. One ProgrammeContact per programme in ProgrammeValuation, so a
// boundary message always has somewhere to send the user. Curated real contact/manage URLs for the majors;
// generic placeholders otherwise. PHONE NUMBERS ARE PLACEHOLDERS — real numbers are a pre-go-live task.
const prisma = require("../config/database");

// Curated real-ish manage/contact pages for the biggest programmes (phones still placeholder).
const CURATED = {
  marriott_bonvoy: { phoneUk: "0800 221 222", contactUrl: "https://help.marriott.com/", manageUrl: "https://www.marriott.com/loyalty/findReservationList.mi", hoursNote: "24/7" },
  hilton_honors: { phoneUk: "0800 44 55 66", contactUrl: "https://help.hilton.com/", manageUrl: "https://www.hilton.com/en/hilton-honors/guest/my-account/", hoursNote: "24/7" },
  world_of_hyatt: { phoneUk: "0845 888 1234", contactUrl: "https://help.hyatt.com/", manageUrl: "https://www.hyatt.com/en-US/member/trips", hoursNote: "24/7" },
  ihg_one: { phoneUk: "0871 423 4896", contactUrl: "https://www.ihg.com/customercare/", manageUrl: "https://www.ihg.com/rewardsclub/gb/en/account/trips", hoursNote: "24/7" },
  ba_avios: { phoneUk: "0344 493 0787", contactUrl: "https://www.britishairways.com/travel/contact-us/", manageUrl: "https://www.britishairways.com/travel/managebooking/", hoursNote: "Daily 07:00–20:00 GMT" },
  united_mp: { phoneUk: "0845 607 6760", contactUrl: "https://www.united.com/en/gb/customer-care", manageUrl: "https://www.united.com/en/gb/manageres/mytrips", hoursNote: "24/7" },
  virgin_atlantic: { phoneUk: "0344 874 7747", contactUrl: "https://help.virginatlantic.com/", manageUrl: "https://www.virginatlantic.com/manage-my-booking", hoursNote: "Daily 08:00–18:00 GMT" },
  emirates_skywards: { phoneUk: "0344 800 2777", contactUrl: "https://www.emirates.com/uk/english/help/", manageUrl: "https://www.emirates.com/uk/english/manage-booking/", hoursNote: "24/7" },
};

function fallback(displayName) {
  const q = encodeURIComponent(`${displayName} manage my booking`);
  return {
    phoneUk: null,
    phoneIntl: null,
    contactUrl: `https://www.google.com/search?q=${encodeURIComponent(`${displayName} customer service`)}`,
    manageUrl: `https://www.google.com/search?q=${q}`,
    hoursNote: null,
  };
}

async function seedProgrammeContacts() {
  const programmes = await prisma.programmeValuation.findMany({ select: { programme: true, displayName: true } });
  let n = 0;
  for (const p of programmes) {
    const c = CURATED[p.programme] || fallback(p.displayName || p.programme);
    await prisma.programmeContact.upsert({
      where: { programme: p.programme },
      update: { displayName: p.displayName || p.programme, phoneUk: c.phoneUk ?? null, phoneIntl: c.phoneIntl ?? null, contactUrl: c.contactUrl, manageUrl: c.manageUrl, hoursNote: c.hoursNote ?? null },
      create: { programme: p.programme, displayName: p.displayName || p.programme, phoneUk: c.phoneUk ?? null, phoneIntl: c.phoneIntl ?? null, contactUrl: c.contactUrl, manageUrl: c.manageUrl, hoursNote: c.hoursNote ?? null },
    });
    n++;
  }
  console.log(`Seeded ${n} programme contacts (${Object.keys(CURATED).length} curated, rest placeholder — phones are placeholders pending real numbers).`);
}

module.exports = { seedProgrammeContacts };

if (require.main === module) seedProgrammeContacts().finally(() => prisma.$disconnect());
