export type WikiMasterConceptSeed = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  definition: string;
  whyItMatters: string;
  debate: string;
  visualMotifs: string[];
  related: string[];
};

export const wikiMasterConcepts: WikiMasterConceptSeed[] = [
  {
    title: 'terra nullius',
    slug: 'terra-nullius',
    category: 'Law',
    summary:
      "A doctrine that treated land as belonging to no one and was used to justify colonial claims and sovereignty.",
    definition:
      "Terra nullius is a legal fiction that labels territory as empty, unused, or ownerless even when people already live there or rely on it.",
    whyItMatters:
      'It shaped colonial expansion, land seizure, and the legal erasure of Indigenous presence, so it still matters in debates about sovereignty and restitution.',
    debate:
      "Supporters historically treated it as a clean way to settle title, while critics see it as a powerful example of law being used to deny existing societies and their rights.",
    visualMotifs: ['void map', 'topographic slab', 'border frame', 'empty territory'],
    related: ['nimbyism', 'safetyism'],
  },
  {
    title: 'safetyism',
    slug: 'safetyism',
    category: 'Public policy',
    summary:
      'An approach to policy that treats avoiding risk as the primary goal, sometimes above benefits, tradeoffs, or public resilience.',
    definition:
      'Safetyism describes an attitude or ideology that gives the highest weight to protection from harm, often expanding caution into a default way of organizing public life.',
    whyItMatters:
      'It affects education, public space, infrastructure, and civic debate because policy can become more restrictive when every downside is treated as decisive.',
    debate:
      'Critics argue it can overstate fragility and narrow what people are allowed to do, while supporters see it as a correction to careless institutions that ignore real harm.',
    visualMotifs: ['shield', 'soft shell', 'protected core', 'risk balance'],
    related: ['nimbyism', 'terra-nullius'],
  },
  {
    title: 'NIMBYism',
    slug: 'nimbyism',
    category: 'Urban Economics',
    summary:
      'Local opposition to development that accepts a project in principle but resists it when it appears nearby.',
    definition:
      'NIMBYism, short for "Not In My Back Yard", describes the tension between broad support for housing, infrastructure, or services and resistance to their placement in one neighborhood.',
    whyItMatters:
      'It helps explain why cities struggle to build housing, transit, and facilities even when the need is widely acknowledged, because local veto power can outweigh collective demand.',
    debate:
      'Critics see it as self-protective obstruction, while defenders point to real concerns about scale, consultation, displacement, and neighborhood character.',
    visualMotifs: ['barrier ring', 'residential block', 'central volume', 'friction halo'],
    related: ['safetyism', 'terra-nullius'],
  },
];

export const wikiMasterMarkdown = wikiMasterConcepts
  .map(
    (concept) => `## ${concept.category}\n- ${concept.title}: ${concept.summary}`,
  )
  .join('\n\n');
