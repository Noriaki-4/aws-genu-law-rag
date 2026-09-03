export type LegalRagQuestionTopic = 'lease' | 'finance' | 'pharma';

export type LegalRagQuestion = {
  id: string;
  level: 1 | 2 | 3;
  topic: LegalRagQuestionTopic;
  translationKey: string;
  legalAsOf: string;
};

export const LEGAL_RAG_QUESTIONS: readonly LegalRagQuestion[] = [
  {
    id: 'sale-of-building-on-leased-land',
    level: 1,
    topic: 'lease',
    translationKey:
      'legal_rag.question_library.questions.sale_of_building_on_leased_land',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'rental-home-move-out',
    level: 1,
    topic: 'lease',
    translationKey: 'legal_rag.question_library.questions.rental_home_move_out',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'lease-term-differences',
    level: 1,
    topic: 'lease',
    translationKey:
      'legal_rag.question_library.questions.lease_term_differences',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'pharma-compliance-structure',
    level: 2,
    topic: 'pharma',
    translationKey:
      'legal_rag.question_library.questions.pharma_compliance_structure',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'pharma-marketing-authorization',
    level: 2,
    topic: 'pharma',
    translationKey:
      'legal_rag.question_library.questions.pharma_marketing_authorization',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'annual-securities-report-filing',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.annual_securities_report_filing',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'small-number-private-placement',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.small_number_private_placement',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'tender-offer-share-acquisition',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_share_acquisition',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'restricted-stock-compensation',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.restricted_stock_compensation',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'tender-offer-small-holder-exemption',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_small_holder_exemption',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-special-related-parties',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_special_related_parties',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-notice-methods',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_methods',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-notice-policy',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_policy',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-notice-amendment-impact',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_amendment_impact',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'nonresident-tender-offer-procedure',
    level: 3,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.nonresident_tender_offer_procedure',
    legalAsOf: '2026-08-27',
  },
] as const;
