// ============================================================
// Quick Add Component
// Natural language task input with smart parsing
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { parseQuickAdd } from '../engine/quickAddParser';

const EXAMPLES = [
  'Write Act Three of documentary, due by end of month',
  'Edit livestream clips for vertical, no deadline',
  'Call production director about March shoot',
  'Name change documents, whenever',
  'Research IronMouse clips for Act Two, high priority',
];

export default function QuickAdd() {
  const { state, dispatch } = useAppStore();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseQuickAdd> | null>(null);
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (value: string) => {
    setInput(value);
    if (value.trim().length > 2) {
      const projects = state.projects.map(p => ({ id: p.id, name: p.name }));
      setPreview(parseQuickAdd(value, projects));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const projects = state.projects.map(p => ({ id: p.id, name: p.name }));
    const parsed = parseQuickAdd(input, projects);
    dispatch({ type: 'ADD_TASK', payload: parsed });
    setInput('');
    setPreview(null);
    inputRef.current?.focus();
  };

  const categoryLabel = (cat: string) => cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const priorityColor = (p: string) => {
    if (p === 'high') return 'var(--color-red)';
    if (p === 'medium') return 'var(--color-amber)';
    return 'var(--color-slate)';
  };

  return (
    <div className="quick-add">
      <form onSubmit={handleSubmit} className="quick-add-form">
        <div className="quick-add-input-wrapper">
          <span className="quick-add-icon">+</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => handleChange(e.target.value)}
            placeholder={placeholder}
            className="quick-add-input"
            autoComplete="off"
          />
          <button type="submit" className="quick-add-btn" disabled={!input.trim()}>
            Add
          </button>
        </div>
      </form>

      {preview && (
        <div className="quick-add-preview">
          <div className="preview-row">
            <span className="preview-label">Category:</span>
            <span className="preview-badge">{categoryLabel(preview.category)}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Priority:</span>
            <span className="preview-badge" style={{ background: priorityColor(preview.priority) }}>
              {preview.priority.toUpperCase()}
            </span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Type:</span>
            <span>{preview.workType.replace(/_/g, ' ')}</span>
          </div>
          {preview.isPhoneTask && (
            <div className="preview-row">
              <span className="preview-tag phone-tag">Phone Task</span>
            </div>
          )}
          {preview.isBacklog && (
            <div className="preview-row">
              <span className="preview-tag backlog-tag">Backlog</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
