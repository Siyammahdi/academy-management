'use client';

import { useParams } from 'next/navigation';
import { BatchRoster } from '../../../../../components/batches/batch-roster';

export default function ManagerBatchRosterPage() {
  const params = useParams<{ id: string }>();

  return (
    <BatchRoster
      batchId={params.id}
      loadErrorMessage="This batch could not be loaded. You may not be assigned to it."
    />
  );
}
