/** Alignment guides: a dragged box snaps to the card and to the other elements (edges and centers). */
export type Boite = { x: number; y: number; width: number; height: number };

export type ResultatSnap = {
  dx: number;
  dy: number;
  /** Positions of the guide lines to draw, in card coordinates. */
  verticales: number[];
  horizontales: number[];
};

const reperes = (debut: number, taille: number) => [debut, debut + taille / 2, debut + taille];

function meilleurEcart(mobiles: number[], cibles: number[], seuil: number) {
  let meilleur: { ecart: number; guide: number } | null = null;
  for (const mobile of mobiles) {
    for (const cible of cibles) {
      const ecart = cible - mobile;
      if (Math.abs(ecart) <= seuil && (!meilleur || Math.abs(ecart) < Math.abs(meilleur.ecart))) {
        meilleur = { ecart, guide: cible };
      }
    }
  }
  return meilleur;
}

export function calculerSnap(boite: Boite, autres: Boite[], carte: { width: number; height: number }, seuil = 5): ResultatSnap {
  const ciblesX = [...reperes(0, carte.width), ...autres.flatMap((a) => reperes(a.x, a.width))];
  const ciblesY = [...reperes(0, carte.height), ...autres.flatMap((a) => reperes(a.y, a.height))];
  const x = meilleurEcart(reperes(boite.x, boite.width), ciblesX, seuil);
  const y = meilleurEcart(reperes(boite.y, boite.height), ciblesY, seuil);
  return {
    dx: x?.ecart ?? 0,
    dy: y?.ecart ?? 0,
    verticales: x ? [x.guide] : [],
    horizontales: y ? [y.guide] : [],
  };
}
