import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  Modal,
  Table,
  type ModalProps,
  type TableColumn,
  type TableProps,
} from '../packages/ui/src/index';

describe('@oneday/ui P1-B shared kit', () => {
  it('exports dense Table and accessible Modal primitives', () => {
    expect(Table).toBeTypeOf('function');
    expect(Modal).toBeTypeOf('function');
  });

  it('types carry dense list and dialog fan-out', () => {
    const columns: TableColumn<{ id: string; name: string }>[] = [
      { key: 'name', header: '名称' },
      { key: 'id', header: 'ID', width: 120 },
    ];
    const props: TableProps<{ id: string; name: string }> = {
      columns,
      rows: [{ id: '1', name: '示例' }],
      rowKey: (row) => row.id,
    };
    expect(props.columns.length).toBe(2);
    expect(props.rows[0].name).toBe('示例');
    const modal: ModalProps = {
      open: true,
      title: '证据',
      onClose: () => undefined,
      children: null,
    };
    expect(modal.open).toBe(true);
  });

  it('projects Table and Modal classes into the design-token foundation', () => {
    const css = readFileSync(
      new URL('../packages/design-tokens/foundation.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain('.od-table');
    expect(css).toContain('.od-table__head');
    expect(css).toContain('.od-table__cell');
    expect(css).toContain('.od-modal__backdrop');
    expect(css).toContain('.od-modal');
    expect(css).toContain('.od-modal__close');
    // Shared kit classes stay token-based — no raw hex in the new primitives.
    const [tablesSection] = css.split('.od-modal__backdrop');
    expect(tablesSection).toContain('var(--od-surface)');
  });
});
