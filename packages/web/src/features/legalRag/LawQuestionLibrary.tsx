import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { filterResidentQuestions } from './residentQuestions';

type Props = {
  open: boolean;
  disabled: boolean;
  municipality: string;
  onClose: () => void;
  onSelect: (question: string) => void;
};

export default function LawQuestionLibrary({
  open,
  disabled,
  municipality,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [level, setLevel] = useState(0);
  const [query, setQuery] = useState('');
  const questions = filterResidentQuestions(level, query);
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="bg-aws-squid-ink/60 fixed inset-0" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <Dialog.Panel className="text-aws-font-color w-full max-w-5xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="text-xl font-semibold">
                {t('legal_rag.resident_library.title')}
              </Dialog.Title>
              <button className="rounded border px-3 py-1" onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
            <Dialog.Description className="my-3 text-sm">
              {t('legal_rag.resident_library.notice')}
            </Dialog.Description>
            <p className="mb-3 text-sm">
              {municipality
                ? t('legal_rag.resident_library.municipality', {
                    name: municipality,
                  })
                : t('legal_rag.resident_library.choose_municipality')}
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label>
                {t('legal_rag.resident_library.level')}
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}>
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {t(`legal_rag.resident_library.level_${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('legal_rag.resident_library.search')}
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <p className="mb-3 text-sm">
              {t('legal_rag.resident_library.count', {
                count: questions.length,
              })}
            </p>
            {questions.length === 0 && (
              <p>{t('legal_rag.resident_library.empty')}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {questions.map((q) => (
                <article
                  key={q.id}
                  className="border-aws-font-color/20 rounded-xl border p-4">
                  <p className="text-aws-font-color/70 text-sm">{q.id}</p>
                  <h3 className="my-2 font-semibold">{q.title}</h3>
                  {q.hypothetical && (
                    <p className="bg-aws-smile/10 mb-2 rounded p-2 text-sm">
                      {t('legal_rag.resident_library.hypothetical')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {q.question}
                  </p>
                  <button
                    className="bg-aws-squid-ink mt-3 rounded px-3 py-2 text-sm text-white disabled:opacity-40"
                    disabled={disabled || !municipality}
                    onClick={() => {
                      onSelect(q.question);
                      onClose();
                    }}>
                    {t('legal_rag.resident_library.apply', { id: q.id })}
                  </button>
                </article>
              ))}
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
