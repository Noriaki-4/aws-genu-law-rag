import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiBooks, PiMagnifyingGlass, PiX } from 'react-icons/pi';
import Button from '../../components/Button';
import { LEGAL_RAG_QUESTIONS, LegalRagQuestionTopic } from './questionLibrary';

type LevelFilter = 'all' | 1 | 2;
type TopicFilter = 'all' | LegalRagQuestionTopic;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (question: string) => void;
};

const LEVEL_FILTERS: readonly LevelFilter[] = ['all', 1, 2];
const TOPIC_FILTERS: readonly TopicFilter[] = ['all', 'finance'];

const QuestionLibraryDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectQuestion,
}) => {
  const { t } = useTranslation();
  const [level, setLevel] = useState<LevelFilter>('all');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(
    LEGAL_RAG_QUESTIONS[0]?.id ?? ''
  );

  const questions = useMemo(
    () =>
      LEGAL_RAG_QUESTIONS.map((question) => ({
        ...question,
        title: t(`${question.translationKey}.title`),
        question: t(`${question.translationKey}.question`),
        expectedSources: t(`${question.translationKey}.expected_sources`),
      })),
    [t]
  );

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja');
    return questions.filter((question) => {
      if (level !== 'all' && question.level !== level) return false;
      if (topic !== 'all' && question.topic !== topic) return false;
      if (!normalizedQuery) return true;
      return [question.title, question.question, question.expectedSources].some(
        (value) => value.toLocaleLowerCase('ja').includes(normalizedQuery)
      );
    });
  }, [level, query, questions, topic]);

  const selectedQuestion =
    filteredQuestions.find((question) => question.id === selectedId) ??
    filteredQuestions[0];

  const selectQuestion = (id: string) => {
    setSelectedId(id);
  };

  const applyQuestion = () => {
    if (!selectedQuestion) return;
    onSelectQuestion(selectedQuestion.question);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-0 sm:p-4">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="flex h-dvh w-full flex-col bg-white text-left shadow-xl transition-all sm:h-[85vh] sm:max-w-6xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <PiBooks className="text-aws-smile text-2xl" />
                    <Dialog.Title className="text-lg font-semibold">
                      {t('legal_rag.question_library.title')}
                    </Dialog.Title>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {t('legal_rag.question_library.question_count', {
                        count: LEGAL_RAG_QUESTIONS.length,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-xl text-gray-500 hover:bg-gray-100"
                    aria-label={t('common.close')}
                    onClick={onClose}>
                    <PiX />
                  </button>
                </div>

                <div className="space-y-3 border-b p-4 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_FILTERS.map((filter) => {
                      const count = LEGAL_RAG_QUESTIONS.filter(
                        (question) =>
                          filter === 'all' || question.level === filter
                      ).length;
                      return (
                        <button
                          key={filter}
                          type="button"
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            level === filter
                              ? 'border-aws-smile bg-orange-50 font-semibold text-orange-800'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => setLevel(filter)}>
                          {t('legal_rag.question_library.filter_label', {
                            label:
                              filter === 'all'
                                ? t('legal_rag.question_library.all')
                                : t('legal_rag.question_library.level', {
                                    level: filter,
                                  }),
                            count,
                          })}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_15rem]">
                    <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                      <PiMagnifyingGlass className="shrink-0 text-gray-500" />
                      <input
                        type="search"
                        className="min-w-0 flex-1 bg-transparent outline-none"
                        placeholder={t(
                          'legal_rag.question_library.search_placeholder'
                        )}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </label>
                    <select
                      aria-label={t('legal_rag.question_library.topic')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                      value={topic}
                      onChange={(event) =>
                        setTopic(event.target.value as TopicFilter)
                      }>
                      {TOPIC_FILTERS.map((filter) => (
                        <option key={filter} value={filter}>
                          {t(`legal_rag.question_library.topics.${filter}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(18rem,2fr)_minmax(0,3fr)]">
                  <div className="max-h-56 overflow-y-auto border-b p-3 md:max-h-none md:border-b-0 md:border-r">
                    {filteredQuestions.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">
                        {t('legal_rag.question_library.no_results')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredQuestions.map((question) => (
                          <button
                            key={question.id}
                            type="button"
                            className={`w-full rounded-lg border p-3 text-left transition ${
                              selectedQuestion?.id === question.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                            onClick={() => selectQuestion(question.id)}>
                            <span className="text-xs font-semibold text-orange-700">
                              {t('legal_rag.question_library.level', {
                                level: question.level,
                              })}
                            </span>
                            <span className="mt-1 block font-medium text-gray-900">
                              {question.title}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs text-gray-600">
                              {question.question}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                    {selectedQuestion && (
                      <div className="mx-auto max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-orange-100 px-2 py-1 font-semibold text-orange-800">
                            {t('legal_rag.question_library.level', {
                              level: selectedQuestion.level,
                            })}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                            {t(
                              `legal_rag.question_library.topics.${selectedQuestion.topic}`
                            )}
                          </span>
                        </div>
                        <h4 className="mt-3 text-xl font-semibold text-gray-900">
                          {selectedQuestion.title}
                        </h4>
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="select-text whitespace-pre-wrap text-base leading-7 text-gray-900">
                            {selectedQuestion.question}
                          </p>
                        </div>

                        <div className="mt-4">
                          <Button onClick={applyQuestion}>
                            {t('legal_rag.question_library.apply')}
                          </Button>
                        </div>

                        <details className="mt-5 rounded-lg border border-gray-200">
                          <summary className="cursor-pointer p-3 font-medium text-gray-700">
                            {t('legal_rag.question_library.reference_details')}
                          </summary>
                          <dl className="grid gap-3 border-t border-gray-200 p-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="font-medium text-gray-600">
                                {t(
                                  'legal_rag.question_library.expected_sources'
                                )}
                              </dt>
                              <dd className="mt-1 text-gray-900">
                                {selectedQuestion.expectedSources}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-600">
                                {t('legal_rag.question_library.legal_as_of')}
                              </dt>
                              <dd className="mt-1 text-gray-900">
                                {selectedQuestion.legalAsOf}
                              </dd>
                            </div>
                          </dl>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default QuestionLibraryDialog;
