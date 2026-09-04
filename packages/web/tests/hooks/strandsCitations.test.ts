import { describe, expect, test } from 'vitest';
import { StrandsStreamProcessor } from '../../src/utils/strandsUtils';

describe('legal RAG citation stream event', () => {
  test('returns structured citations without adding them to answer text', () => {
    const processor = new StrandsStreamProcessor();

    const result = processor.processEvent(
      JSON.stringify({
        event: {
          legalRagCitations: {
            citations: [
              {
                documentId: 'law-1',
                contentUnitId: 'law-1-article-1',
                title: 'Companies Act',
                heading: 'Article 1',
                text: 'Cited provision text',
              },
            ],
          },
        },
      })
    );

    expect(result).toEqual({
      text: '',
      legalRagCitations: [
        {
          documentId: 'law-1',
          contentUnitId: 'law-1-article-1',
          title: 'Companies Act',
          heading: 'Article 1',
          text: 'Cited provision text',
        },
      ],
    });
  });
});
