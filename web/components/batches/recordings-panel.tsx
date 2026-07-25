'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { formatDate } from '../../lib/format';
import { ApiError } from '../../lib/api';
import { apiErrorMessage } from '../../lib/error-message';
import {
  createRecording,
  deleteRecording,
  listBatchRecordings,
  updateRecording,
} from '../../lib/admin-api';
import type { Recording } from '../../lib/admin-api';

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

interface RecordingFormState {
  title: string;
  youtubeVideoId: string;
  recordedFor: string;
}

function emptyForm(): RecordingFormState {
  return { title: '', youtubeVideoId: '', recordedFor: '' };
}

function recordingToForm(rec: Recording): RecordingFormState {
  return {
    title: rec.title,
    youtubeVideoId: rec.youtubeVideoId,
    recordedFor: isoToDateInput(rec.recordedFor),
  };
}

// Manager (own batch, via BatchScopeGuard on every route this hits) or
// admin — reaching this panel at all already implies edit rights, same
// reasoning as the class-link field and the homework panel above it.
export function RecordingsPanel({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<Recording[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recording | 'new' | null>(null);

  async function reload(): Promise<void> {
    try {
      setItems(await listBatchRecordings(batchId));
    } catch {
      setError('Recordings could not be loaded.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    listBatchRecordings(batchId)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Recordings could not be loaded.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this recording? This cannot be undone.')) {
      return;
    }
    try {
      await deleteRecording(id);
      await reload();
    } catch {
      setError('This recording could not be deleted. Try again.');
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 font-semibold text-ink">
          Recorded classes
        </h2>
        <Button type="button" size="compact" onClick={() => setEditing('new')}>
          Add recording
        </Button>
      </div>

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {items && items.length === 0 ? (
        <p className="font-body text-body text-ink-muted">
          No recordings added yet.
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="flex flex-col gap-2 border-t border-rule pt-4 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-body text-body font-medium text-ink">
                  {rec.title}
                </span>
                <span className="font-numeric text-sm text-ink-faint">
                  Recorded {formatDate(rec.recordedFor)}
                </span>
              </div>
              <span className="font-numeric text-sm text-ink-faint">
                youtu.be/{rec.youtubeVideoId}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  onClick={() => setEditing(rec)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="compact"
                  onClick={() => void handleDelete(rec.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!items ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {editing ? (
        <RecordingFormModal
          batchId={batchId}
          recording={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function RecordingFormModal({
  batchId,
  recording,
  onClose,
  onSaved,
}: {
  batchId: string;
  recording: Recording | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RecordingFormState>(
    recording ? recordingToForm(recording) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    if (
      !form.title.trim() ||
      !form.youtubeVideoId.trim() ||
      !form.recordedFor
    ) {
      setError('Fill in a title, a YouTube link or id, and the class date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (recording) {
        await updateRecording(recording.id, form);
      } else {
        await createRecording(batchId, form);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This recording could not be saved.')
          : 'This recording could not be saved.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={recording ? 'Edit recording' : 'Add recording'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
        <Input
          label="YouTube link or video id"
          required
          placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
          value={form.youtubeVideoId}
          onChange={(e) =>
            setForm((p) => ({ ...p, youtubeVideoId: e.target.value }))
          }
        />
        <Input
          label="Class date"
          type="date"
          required
          value={form.recordedFor}
          onChange={(e) =>
            setForm((p) => ({ ...p, recordedFor: e.target.value }))
          }
        />

        {error ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving…'
              : recording
                ? 'Save changes'
                : 'Add recording'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
