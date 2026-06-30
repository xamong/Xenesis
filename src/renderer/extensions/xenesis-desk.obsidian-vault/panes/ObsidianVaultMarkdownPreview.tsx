import { useMemo, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { createPreviewAdapter } from '../../../editing/previewAdapter';
import { useEditableSurface } from '../../../editing/useEditableSurface';
import type { VaultIndex, VaultNote } from '../vaultTypes';

interface ObsidianVaultMarkdownPreviewProps {
  note: VaultNote;
  index: VaultIndex;
  onSelectNote(noteId: string): void;
  onOpenAttachment(path: string): void;
}

export function ObsidianVaultMarkdownPreview({
  note,
  index,
  onSelectNote,
  onOpenAttachment,
}: ObsidianVaultMarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const markdown = useMemo(() => replaceWikilinksWithMarkdownLinks(note.body), [note.body]);
  const vaultMarkdownPreviewAdapter = useMemo(
    () =>
      createPreviewAdapter({
        id: `obsidian-preview:${note.id}`,
        label: `${note.title} preview`,
        getElement: () => previewRef.current,
      }),
    [note.id, note.title],
  );
  const vaultMarkdownPreviewSurface = useEditableSurface({
    adapter: vaultMarkdownPreviewAdapter,
    includeSave: false,
  });

  const components: Components = {
    a({ href, children }) {
      if (href?.startsWith('vault://')) {
        const rawTarget = decodeURIComponent(href.slice('vault://'.length));
        const resolved = index.links.find((link) => link.source === note.id && link.rawTarget === rawTarget);
        const unresolved = note.links.find((link) => link.target === rawTarget);
        return (
          <button
            className="ov-link-button"
            type="button"
            onClick={() => {
              if (resolved) onSelectNote(resolved.target);
            }}
            disabled={!resolved}
            title={resolved ? resolved.target : `Unresolved: ${unresolved?.target || rawTarget}`}
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    },
  };

  return (
    <div
      ref={previewRef}
      className="ov-markdown-preview"
      onFocusCapture={vaultMarkdownPreviewSurface.onFocusCapture}
      onPointerDownCapture={vaultMarkdownPreviewSurface.onPointerDownCapture}
      onContextMenu={vaultMarkdownPreviewSurface.onContextMenu}
      onKeyDown={vaultMarkdownPreviewSurface.onKeyDown}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {markdown}
      </ReactMarkdown>
      {note.attachments.length > 0 && (
        <div className="ov-attachments">
          <h3>Attachments</h3>
          {note.attachments.map((attachment, indexNumber) => (
            <button
              key={`${attachment.kind}:${attachment.target}:${indexNumber}`}
              className="ov-attachment"
              type="button"
              disabled={!attachment.safe}
              onClick={() => onOpenAttachment(attachment.resolvedPath)}
            >
              <span>{attachment.label || attachment.target}</span>
              <small>{attachment.safe ? attachment.resolvedPath : 'Outside vault boundary'}</small>
            </button>
          ))}
        </div>
      )}
      {vaultMarkdownPreviewSurface.menuElement}
    </div>
  );
}

function replaceWikilinksWithMarkdownLinks(source: string): string {
  return String(source || '').replace(
    /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g,
    (_match, target, heading, label) => {
      const rawTarget = String(target || '').trim();
      const suffix = heading ? `#${String(heading).trim()}` : '';
      const display = String(label || target || '').trim();
      return `[${display}](vault://${encodeURIComponent(rawTarget + suffix)})`;
    },
  );
}
