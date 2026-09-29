import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { filterResidentQuestions } from './residentQuestions';

type Props = {
  disabled: boolean;
  municipality: string;
  onSelect: (question: string) => void;
};

const levels = [1, 2, 3, 4, 5] as const;

export default function LawQuestionLibrary({
  disabled,
  municipality,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const questions = filterResidentQuestions(0, query);
  return (
    <section className="mx-auto max-w-6xl p-5 md:p-9">
      <h2 className="text-xl font-semibold">
        {t('legal_rag.resident_library.title')}
      </h2>
      <p className="mt-3 text-sm leading-relaxed">
        {t('legal_rag.resident_library.notice')}
      </p>
      <p className="mt-3 text-sm">
        {municipality
          ? t('legal_rag.resident_library.municipality', {
              name: municipality,
            })
          : t('legal_rag.resident_library.choose_municipality')}
      </p>
      <label className="mt-5 block text-sm font-semibold">
        {t('legal_rag.resident_library.search')}
        <input
          className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 font-normal"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <nav
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label={t('legal_rag.resident_library.level_index')}>
        {levels.map((level) => (
          <a
            className="border-aws-font-color/20 hover:border-aws-sky hover:bg-aws-sky/10 rounded-lg border bg-white p-4 transition-colors"
            href={`#question-level-${level}`}
            key={level}>
            <strong className="block text-sm">
              {t('legal_rag.resident_library.level_badge', { level })}
            </strong>
            <span className="mt-1 block text-sm">
              {t(`legal_rag.resident_library.level_${level}_title`)}
            </span>
            <span className="text-aws-font-color/70 mt-2 block text-xs">
              {t('legal_rag.resident_library.count', {
                count: questions.filter((q) => q.level === level).length,
              })}
            </span>
          </a>
        ))}
      </nav>
      {questions.length === 0 && (
        <p className="mt-6">{t('legal_rag.resident_library.empty')}</p>
      )}
      {levels.map((level) => {
        const levelQuestions = questions.filter((q) => q.level === level);
        if (levelQuestions.length === 0) return null;
        return (
          <section
            className="mt-10 scroll-mt-6"
            id={`question-level-${level}`}
            key={level}
            aria-labelledby={`question-level-title-${level}`}>
            <div className="flex items-start gap-4">
              <span className="bg-aws-sky rounded px-3 py-1 text-xs font-semibold text-white">
                {t('legal_rag.resident_library.level_badge', { level })}
              </span>
              <div>
                <h3
                  className="text-lg font-semibold"
                  id={`question-level-title-${level}`}>
                  {t(`legal_rag.resident_library.level_${level}_title`)}
                </h3>
                <p className="text-aws-font-color/70 mt-1 text-sm">
                  {t(`legal_rag.resident_library.level_${level}_description`)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {levelQuestions.map((q) => (
                <article
                  key={q.id}
                  className="border-aws-font-color/20 rounded-lg border bg-white p-5 shadow-sm">
                  <p className="text-aws-font-color/70 text-sm">{q.id}</p>
                  <h4 className="my-2 font-semibold">{q.title}</h4>
                  {q.hypothetical && (
                    <p className="bg-aws-smile/10 mb-2 rounded p-2 text-sm">
                      {t('legal_rag.resident_library.hypothetical')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {q.question}
                  </p>
                  <button
                    className="bg-aws-smile border-aws-smile mt-4 rounded-lg border px-3 py-2 text-sm text-white hover:brightness-75 disabled:opacity-40"
                    disabled={disabled || !municipality}
                    onClick={() => onSelect(q.question)}>
                    {t('legal_rag.resident_library.apply', { id: q.id })}
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
