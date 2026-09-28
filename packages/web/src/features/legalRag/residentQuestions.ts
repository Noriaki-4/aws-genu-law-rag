import catalog from './residentQuestions.json';

export const residentQuestions = catalog.questions;

export function filterResidentQuestions(level: number, query: string) {
  const term = query.trim().toLocaleLowerCase();
  return residentQuestions.filter(
    (q) =>
      (!level || q.level === level) &&
      [q.id, q.title, q.question].some((value) =>
        value.toLocaleLowerCase().includes(term)
      )
  );
}
