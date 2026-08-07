/**
 * events.js
 * -----------------------------------------------------------------------
 * Single source of truth for every Connexion 26 event.
 * Add a new event by pushing another object into EVENTS — every page
 * (home grid, filters, registration auto-fill) reads from this file.
 *
 * band: which category band the event belongs to. Drives the
 *       category color used on the card, the badge, and the register page.
 * -----------------------------------------------------------------------
 */

const BANDS = {
  stage:  { label: "Stage",   hue: "#7C3AED", hue2: "#EC4899" }, // violet -> pink
  visual: { label: "Visual",  hue: "#06B6D4", hue2: "#2563EB" }, // cyan -> blue
  mind:   { label: "Mind",    hue: "#10B981", hue2: "#06B6D4" }, // green -> cyan
  arena:  { label: "Arena",   hue: "#F59E0B", hue2: "#EF4444" }, // amber -> red
  social: { label: "Social",  hue: "#EC4899", hue2: "#F59E0B" }, // pink -> amber
};

const EVENTS = [
  {
    id: "ipl-auction",
    name: "IPL Auction",
    band: "arena",
    tagline: "Group event for 3 members.",
    description: "Draft the best IPL squad and win the auction in this 3-member group event.",
    image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-17",
    time: "10:00 AM",
    venue: "Main Hall",
    fee: 100,
    prize: "₹5,000 + Trophy",
    seats: 60,
    seatsLeft: 60,
    teamEvent: true,
    teamMin: 3,
    teamMax: 3,
  },
  {
    id: "business-quiz",
    name: "Business Quiz",
    band: "mind",
    tagline: "Group event for 2 members.",
    description: "Answer business and strategy questions with your partner in this 2-member quiz event.",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-17",
    time: "12:00 PM",
    venue: "Seminar Hall B",
    fee: 80,
    prize: "₹4,000 + Certificates",
    seats: 50,
    seatsLeft: 50,
    teamEvent: true,
    teamMin: 2,
    teamMax: 2,
  },
  {
    id: "adaptune",
    name: "Adaptune",
    band: "stage",
    tagline: "Solo event.",
    description: "Perform solo to surprise music prompts and adapt your tune on stage.",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-18",
    time: "10:00 AM",
    venue: "Auditorium A",
    fee: 80,
    prize: "₹3,500 + Trophy",
    seats: 40,
    seatsLeft: 40,
  },
  {
    id: "reels-making",
    name: "Reels Making",
    band: "visual",
    tagline: "Solo event.",
    description: "Create a short reel solo and submit it for judging.",
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-18",
    time: "12:00 PM",
    venue: "Media Lab",
    fee: 80,
    prize: "₹3,000 + Certificate",
    seats: 40,
    seatsLeft: 40,
  },
  {
    id: "shipwreck",
    name: "Shipwreck",
    band: "social",
    tagline: "Solo event.",
    description: "Pitch a dramatic shipwreck survival story solo in front of the judges.",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-18",
    time: "2:00 PM",
    venue: "Seminar Hall C",
    fee: 70,
    prize: "₹3,000 + Certificate",
    seats: 35,
    seatsLeft: 35,
  },
  {
    id: "photography",
    name: "Photography",
    band: "visual",
    tagline: "Solo event.",
    description: "Capture the best festival moment solo and submit your photo for live judging.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-17",
    time: "3:00 PM",
    venue: "Campus Grounds",
    fee: 80,
    prize: "₹3,000 + Trophy",
    seats: 50,
    seatsLeft: 50,
  },
  {
    id: "channel-surfing",
    name: "Channel Surfing",
    band: "social",
    tagline: "Group event for 2 members.",
    description: "Create a fast-paced channel-themed pitch and video with your partner.",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-18",
    time: "4:30 PM",
    venue: "Media Lab Screening Room",
    fee: 90,
    prize: "₹4,000 + Certificates",
    seats: 40,
    seatsLeft: 40,
    teamEvent: true,
    teamMin: 2,
    teamMax: 2,
  },
  {
    id: "ad-making",
    name: "Ad Making",
    band: "visual",
    tagline: "Solo event.",
    description: "Create and pitch an ad concept to the judges solo.",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-19",
    time: "10:00 AM",
    venue: "Seminar Hall D",
    fee: 80,
    prize: "₹3,500 + Certificate",
    seats: 35,
    seatsLeft: 35,
  },
  {
    id: "2mins-short-film",
    name: "2 Mins Short Film",
    band: "visual",
    tagline: "Group event, maximum 5 members.",
    description: "Make a 2-minute short film with up to 5 members and submit it for screening.",
    image: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-19",
    time: "12:00 PM",
    venue: "Media Lab Screening Room",
    fee: 100,
    prize: "₹4,500 + Screening Slot",
    seats: 40,
    seatsLeft: 40,
    teamEvent: true,
    teamMin: 2,
    teamMax: 5,
  },
  {
    id: "ai-prompt-challenge",
    name: "AI Prompt Challenge",
    band: "mind",
    tagline: "Solo event.",
    description: "Write the best AI prompt and generate a creative output solo.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    date: "2026-09-19",
    time: "2:30 PM",
    venue: "Computer Lab 1",
    fee: 90,
    prize: "₹3,500 + Certificate",
    seats: 40,
    seatsLeft: 40,
  },
];

// Helper — used across pages to fetch a single event by its URL-safe id or name.
function findEvent(idOrName) {
  if (!idOrName) return null;
  const key = decodeURIComponent(idOrName).trim().toLowerCase();
  return EVENTS.find(
    (e) => e.id.toLowerCase() === key || e.name.toLowerCase() === key
  ) || null;
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
