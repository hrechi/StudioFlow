/**
 * Curated Unsplash photos used by the mock data and the front office.
 * Every ID was checked to load (images.unsplash.com is allowed in next.config.ts).
 * When a real photo URL (Cloudinary) is available, use it instead — `SafeImage`
 * falls back to /images/placeholder.svg if a URL fails.
 */

export const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export function unsplash(id: string, width = 1600): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

const ids = {
  mariage: [
    "1519741497674-611481863552",
    "1511285560929-80b456fea0bc",
    "1465495976277-4387d4b0b4c6",
    "1606216794074-735e91aa2c92",
    "1522673607200-164d1b6ce486",
    "1537633552985-df8429e8048b",
    "1583939003579-730e3918a45a",
    "1519225421980-715cb0215aed",
    "1469371670807-013ccf25f16a",
    "1520854221256-17451cc331bf",
    "1591604466107-ec97de577aff",
    "1606800052052-a08af7148866",
    "1515934751635-c81c6bc9a2d8",
    "1529636798458-92182e662485",
    "1460978812857-470ed1c77af0",
    "1525258946800-98cfd641d0de",
    "1546032996-6dfacbacbf3f",
  ],
  portrait: [
    "1494790108377-be9c29b29330",
    "1500648767791-00dcc994a43e",
    "1438761681033-6461ffad8d80",
    "1507003211169-0a1dd7228f2d",
    "1534528741775-53994a69daeb",
    "1544005313-94ddf0286df2",
    "1531746020798-e6953c6e8e04",
    "1573496359142-b8d87734a5a2",
    "1560250097-0b93528c311a",
    "1580489944761-15a19d654956",
    "1506794778202-cad84cf45f1d",
    "1517841905240-472988babdf9",
    "1524504388940-b1c1722653e1",
    "1488426862026-3ee34a7d66df",
    "1503023345310-bd7c1de61c7d",
  ],
  produit: [
    "1523275335684-37898b6baf30",
    "1505740420928-5e560c06d30e",
    "1526170375885-4d8ecf77b99f",
    "1572635196237-14b3f281503f",
    "1491553895911-0055eca6402d",
    "1560769629-975ec94e6a86",
    "1546868871-7041f2a55e12",
  ],
  evenement: [
    "1540575467063-178a50c2df87",
    "1492684223066-81342ee5ff30",
    "1505236858219-8359eb29e329",
    "1511578314322-379afb476865",
    "1514525253161-7a46d19cd819",
    "1556761175-5973dc0f32e7",
    "1464366400600-7168b8af9bc3",
    "1530103862676-de8c9debad1d",
    "1478147427282-58a87a120781",
    "1501281668745-f7f57925c3b4",
    "1470229722913-7c0e2dbbafd3",
    "1533174072545-7a4b6ad7a6c3",
  ],
  studio: [
    "1471341971476-ae15ff5dd4ea",
    "1516035069371-29a1b244cc32",
    "1452587925148-ce544e77e70d",
    "1502920917128-1aa500764cbd",
    "1554048612-b6a482bc67e5",
  ],
} as const;

export type ImageCategory = keyof typeof ids;

/** Full-size URLs per category. */
export const MOCK_IMAGES: Record<ImageCategory, string[]> = {
  mariage: ids.mariage.map((id) => unsplash(id)),
  portrait: ids.portrait.map((id) => unsplash(id)),
  produit: ids.produit.map((id) => unsplash(id)),
  evenement: ids.evenement.map((id) => unsplash(id)),
  studio: ids.studio.map((id) => unsplash(id)),
};

/** Deterministic pick: the same index always returns the same photo. */
export function mockImage(category: ImageCategory, index: number): string {
  const list = MOCK_IMAGES[category];
  return list[((index % list.length) + list.length) % list.length];
}

/** Hand-picked images for the front office. */
export const FRONT_IMAGES = {
  hero: unsplash("1519741497674-611481863552", 2400),
  auth: unsplash("1460978812857-470ed1c77af0", 1800),
  register: unsplash("1520854221256-17451cc331bf", 1800),
  studio: unsplash("1471341971476-ae15ff5dd4ea", 2000),
  contact: unsplash("1554048612-b6a482bc67e5", 1600),
} as const;

/** Portrait photos reused as mock avatars (staff and clients). */
export const MOCK_AVATARS = ids.portrait.map((id) => unsplash(id, 160));
