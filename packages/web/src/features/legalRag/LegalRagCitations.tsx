import React from 'react';
import { useTranslation } from 'react-i18next';
import { PiBookOpenText } from 'react-icons/pi';
import { LegalRagCitation } from 'generative-ai-use-cases';

type Props = {
  citations: LegalRagCitation[];
};

const isHttpUrl = (value?: string): value is string =>
  value?.startsWith('https://') === true ||
  value?.startsWith('http://') === true;

const LegalRagCitations: React.FC<Props> = ({ citations }) => {
  const { t } = useTranslation();

  if (citations.length === 0) return null;

  return (
    <section className="bg-gray-100/70 pb-4">
      <div className="mx-auto w-full px-3 md:w-11/12 lg:w-5/6 xl:w-4/6">
        <div className="ml-12 rounded-lg border border-gray-300 bg-white p-3 lg:ml-14">
          <h3 className="flex items-center gap-2 font-semibold">
            <PiBookOpenText />
            {t('legal_rag.citations.title', { count: citations.length })}
          </h3>
          <div className="mt-3 space-y-2">
            {citations.map((citation, index) => {
              const labelParts = [
                citation.title || citation.documentId,
                citation.heading,
                citation.sourcePage === undefined
                  ? undefined
                  : t('legal_rag.citations.page', {
                      page: citation.sourcePage,
                    }),
              ].filter(Boolean);

              return (
                <details
                  key={`${citation.contentUnitId || citation.documentId}-${index}`}
                  className="rounded border border-gray-200 bg-gray-50">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                    {labelParts.join(' / ')}
                  </summary>
                  <div className="space-y-3 border-t border-gray-200 px-3 py-3 text-sm">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-600">
                        {t('legal_rag.citations.text')}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {citation.text ||
                          t('legal_rag.citations.text_unavailable')}
                      </p>
                    </div>
                    {citation.contentUnitId && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-600">
                          {t('legal_rag.citations.content_unit_id')}
                        </p>
                        <code className="block break-all rounded bg-gray-200 px-2 py-1 text-xs">
                          {citation.contentUnitId}
                        </code>
                      </div>
                    )}
                    {isHttpUrl(citation.sourceObjectUri) && (
                      <a
                        className="text-aws-smile underline"
                        href={citation.sourceObjectUri}
                        target="_blank"
                        rel="noreferrer">
                        {t('legal_rag.citations.source')}
                      </a>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LegalRagCitations;
