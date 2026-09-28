import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = process.argv[2];
if (!source)
  throw new Error(
    'Pass local-rag-poc-law/examples/resident-questions/questions.json'
  );
const packaged = new URL(
  '../../packages/web/src/features/legalRag/residentQuestions.json',
  import.meta.url
);
assert.deepEqual(
  JSON.parse(readFileSync(packaged, 'utf8')),
  JSON.parse(readFileSync(source, 'utf8'))
);
console.log(
  'Resident question catalog matches the source, including hypothetical flags.'
);
