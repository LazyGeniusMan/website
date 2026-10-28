export interface ImageCredit {
  id: string;
  file: string;
  caption: string;
  credit: string;
  sourceUrl?: string;
  sealSlug?: string;
}

export const IMAGE_CREDITS: ImageCredit[] = [
  {
    id: "portrait",
    file: "portrait.png",
    caption: "Portrait of Andriyansyah Nurrachman.",
    credit: "Owner archive, used with permission.",
  },
  {
    id: "work-digits-2022",
    file: "work-digits-2022.png",
    caption: "Website redesign for DIGITS Unpad, 2022.",
    credit: "Owner archive, used with permission.",
  },
  {
    id: "work-digits-2020",
    file: "work-digits-2020.png",
    caption: "Website migration for DIGITS Unpad, 2020.",
    credit: "Owner archive, used with permission.",
  },
  {
    id: "work-ojs-2021",
    file: "work-ojs-2021.png",
    caption: "Publishing platform for the Journal of Digital Innovation Studies, 2021.",
    credit: "Owner archive, used with permission.",
  },
  {
    id: "work-sss-2021",
    file: "work-sss-2021.png",
    caption: "Website for Student Study Service, 2021.",
    credit: "Owner archive, used with permission.",
  },
  {
    id: "cert-rutgers-automation",
    file: "cert-rutgers-automation.png",
    caption: "Rutgers SWAM audit automation module certificate, 2022.",
    credit: "Owner archive, used with permission.",
    sealSlug: "rutgers-swam",
  },
  {
    id: "cert-rutgers-ai-audit",
    file: "cert-rutgers-ai-audit.png",
    caption: "Rutgers SWAM AI in accounting and auditing module certificate, 2022.",
    credit: "Owner archive, used with permission.",
    sealSlug: "rutgers-swam",
  },
  {
    id: "cert-rutgers-preprocessing",
    file: "cert-rutgers-preprocessing.png",
    caption: "Rutgers SWAM audit data preprocessing module certificate, 2022.",
    credit: "Owner archive, used with permission.",
    sealSlug: "rutgers-swam",
  },
  {
    id: "cert-gits-internship",
    file: "cert-gits-internship.png",
    caption: "GITS Indonesia internship certificate, 2021.",
    credit: "Owner archive, used with permission.",
    sealSlug: "gits-internship",
  },
  {
    id: "cert-teps",
    file: "cert-teps.png",
    caption: "Test of English Proficiency and Skill certificate, 2023.",
    credit: "Owner archive, used with permission.",
    sealSlug: "teps",
  },
  {
    id: "cert-efset",
    file: "cert-efset.png",
    caption: "EF SET English certificate, 2021.",
    credit: "Owner archive, used with permission.",
    sealSlug: "efset",
  },
  {
    id: "cert-rutgers-mining",
    file: "cert-rutgers-mining.png",
    caption: "Rutgers SWAM process mining certificate, 2022.",
    credit: "Owner archive, used with permission.",
    sealSlug: "rutgers-swam",
  },
];

export function creditFor(id: string): ImageCredit {
  const found = IMAGE_CREDITS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown image credit id: ${id}`);
  return found;
}
