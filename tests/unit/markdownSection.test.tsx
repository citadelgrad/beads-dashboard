import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Issue } from '@shared/types';
import IssueEditorModal from '@/components/IssueEditorModal';
import MarkdownSection from '@/components/IssueEditorModal/MarkdownSection';

function EditableMarkdownSection() {
  const [value, setValue] = useState('12345678');

  return (
    <MarkdownSection
      label="Description"
      value={value}
      onChange={setValue}
      defaultExpanded
    />
  );
}

function createIssue(): Issue {
  return {
    id: 'test-counts',
    title: 'Count fields',
    description: '12345678',
    design: '1234',
    acceptance_criteria: '123456789012',
    notes: '1234567890123456',
    status: 'open',
    issue_type: 'task',
    priority: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('MarkdownSection counts', () => {
  it('shows counts for all four large markdown fields in the issue editor', () => {
    render(
      <IssueEditorModal
        issue={createIssue()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('8 characters · ~2 tokens')).toBeInTheDocument();
    expect(screen.getByText('4 characters · ~1 token')).toBeInTheDocument();
    expect(screen.getByText('12 characters · ~3 tokens')).toBeInTheDocument();
    expect(screen.getByText('16 characters · ~4 tokens')).toBeInTheDocument();
  });

  it('updates the counts live while editing', () => {
    render(<EditableMarkdownSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123456789' } });

    expect(screen.getByText('9 characters · ~3 tokens')).toBeInTheDocument();
  });
});
