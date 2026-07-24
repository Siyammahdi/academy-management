'use client';

import { useParams } from 'next/navigation';
import { BatchRoster } from '../../../../../components/batches/batch-roster';

export default function AdminBatchRosterPage() {
  const params = useParams<{ id: string }>();

  return <BatchRoster batchId={params.id} />;
}
