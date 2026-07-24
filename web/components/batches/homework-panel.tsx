'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Modal } from '../ui/modal';
import { Pill } from '../ui/pill';
import { formatDate } from '../../lib/format';
import { isPastDue } from '../../lib/homework-status';
import { ApiError } from '../../lib/api';
import { apiErrorMessage } from '../../lib/error-message';
import {
  createHomework,
  deleteHomework,
  listBatchHomework,
  updateHomework,
} from '../../lib/admin-api';
import type { Homework } from '../../lib/admin-api';

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

interface HomeworkFormState {
  title: string;
  description: string;
  dueDate: string;
}

function emptyForm(): HomeworkFormState {
  return { title: '', description: '', dueDate: '' };
}

function homeworkToForm(hw: Homework): HomeworkFormState {
  return {
    title: hw.title,
    description: hw.description,
    dueDate: isoToDateInput(hw.dueDate),
  };
}

// Manager (own batch, via BatchScopeGuard on every route this hits) or
// admin — reaching this panel at all already implies edit rights, same
// reasoning as the class-link field above it.
export function HomeworkPanel({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<Homework[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Homework | 'new' | null>(null);

  async function reload(): Promise<void> {
    try {
      setItems(await listBatchHomework(batchId));
    } catch {
      setError('Homework could not be loaded.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    listBatchHomework(batchId)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Homework could not be loaded.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this homework item? This cannot be undone.')) {
      return;
    }
    try {
      await deleteHomework(id);
      await reload();
    } catch {
      setError('This item could not be deleted. Try again.');
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 font-semibold text-ink">
          Homework
        </h2>
        <Button type="button" size="compact" onClick={() => setEditing('new')}>
          Add homework
        </Button>
      </div>

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {items && items.length === 0 ? (
        <p className="font-body text-body text-ink-muted">
          No homework assigned yet.
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {items.map((hw) => {
            const pastDue = isPastDue(hw.dueDate);
            return (
              <li
                key={hw.id}
                className="flex flex-col gap-2 border-t border-rule pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-body text-body font-medium text-ink">
                    {hw.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <Pill
                      status={pastDue ? 'overdue' : 'unpaid'}
                      label={pastDue ? 'Past due' : 'Upcoming'}
                    />
                    <span className="font-numeric text-sm text-ink-faint">
                      Due {formatDate(hw.dueDate)}
                    </span>
                  </div>
                </div>
                <p className="font-body text-sm text-ink-muted">
                  {hw.description}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="compact"
                    onClick={() => setEditing(hw)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="compact"
                    onClick={() => void handleDelete(hw.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!items ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {editing ? (
        <HomeworkFormModal
          batchId={batchId}
          homework={editing === 'new' ? null : editing}
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

function HomeworkFormModal({
  batchId,
  homework,
  onClose,
  onSaved,
}: {
  batchId: string;
  homework: Homework | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<HomeworkFormState>(
    homework ? homeworkToForm(homework) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.description.trim() || !form.dueDate) {
      setError('Fill in a title, description, and due date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (homework) {
        await updateHomework(homework.id, form);
      } else {
        await createHomework(batchId, form);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? apiErrorMessage(err.body, 'This homework could not be saved.')
          : 'This homework could not be saved.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={homework ? 'Edit homework' : 'Add homework'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
        <Textarea
          label="Description"
          required
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
        />
        <Input
          label="Due date"
          type="date"
          required
          value={form.dueDate}
          onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
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
              : homework
                ? 'Save changes'
                : 'Add homework'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
