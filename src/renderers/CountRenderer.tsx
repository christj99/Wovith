import type { CellEvaluationResult } from '@/domain/types';

export function CountRenderer({ result }: { result: CellEvaluationResult }) {
  return (
    <div className="count-renderer">
      <strong>{result.payload.scalar ?? 0}</strong>
      <span>matching items</span>
    </div>
  );
}
