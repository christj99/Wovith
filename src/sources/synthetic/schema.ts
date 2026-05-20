import { asSourceId } from '@/domain/ids';
import type { CanonicalOperator, FieldSchema, FieldType, SourceSchema } from '@/domain/types';

const booleanOperators: CanonicalOperator[] = ['is', 'is_not'];
const stringOperators: CanonicalOperator[] = ['is', 'is_not', 'contains'];
const numberOperators: CanonicalOperator[] = ['is', 'is_not', 'greater_than', 'less_than'];
const timeOperators: CanonicalOperator[] = ['is', 'is_not', 'before', 'after', 'on_or_before', 'on_or_after'];
const arrayOperators: CanonicalOperator[] = ['contains', 'exists', 'not_exists'];

function field(
  name: string,
  label: string,
  type: FieldType,
  allowedOperators: CanonicalOperator[],
  options: Partial<FieldSchema> = {},
): FieldSchema {
  return {
    name,
    label,
    type,
    nullable: options.nullable ?? false,
    repeated: options.repeated ?? false,
    containsExternalContent: options.containsExternalContent ?? false,
    sensitive: options.sensitive ?? false,
    filterable: options.filterable ?? true,
    sortable: options.sortable ?? ['datetime', 'date', 'number', 'string'].includes(type),
    allowedOperators,
    rendererHints: options.rendererHints,
  };
}

export const syntheticSourceSchemas: Record<string, SourceSchema> = {
  'synthetic.mail.threads': {
    sourceId: asSourceId('synthetic.mail.threads'),
    displayName: 'Synthetic Mail Threads',
    description: 'Deterministic fixture mail threads for Stage 0.',
    itemIdField: 'id',
    capabilities: ['local-only', 'supports-pushdown-filter', 'supports-pushdown-sort'],
    defaultRenderer: 'list',
    defaultSort: { field: 'received_at', direction: 'desc' },
    fields: {
      id: field('id', 'Thread ID', 'id', stringOperators),
      subject: field('subject', 'Subject', 'string', stringOperators, {
        containsExternalContent: true,
        rendererHints: ['list', 'table'],
      }),
      sender: field('sender', 'Sender', 'string', stringOperators),
      unread: field('unread', 'Unread', 'boolean', booleanOperators),
      important: field('important', 'Important', 'boolean', booleanOperators),
      received_at: field('received_at', 'Received At', 'datetime', timeOperators),
      project: field('project', 'Project', 'string', stringOperators),
      has_attachment: field('has_attachment', 'Has Attachment', 'boolean', booleanOperators),
      preview: field('preview', 'Preview', 'string', stringOperators, {
        containsExternalContent: true,
        sensitive: true,
        rendererHints: ['list'],
      }),
      labels: field('labels', 'Labels', 'array', arrayOperators, { repeated: true, sortable: false }),
    },
  },
  'synthetic.calendar.events': {
    sourceId: asSourceId('synthetic.calendar.events'),
    displayName: 'Synthetic Calendar Events',
    description: 'Deterministic fixture calendar events for Stage 0.',
    itemIdField: 'id',
    capabilities: ['local-only', 'supports-pushdown-filter', 'supports-pushdown-sort'],
    defaultRenderer: 'table',
    defaultSort: { field: 'start', direction: 'asc' },
    fields: {
      id: field('id', 'Event ID', 'id', stringOperators),
      title: field('title', 'Title', 'string', stringOperators, {
        containsExternalContent: true,
        rendererHints: ['list', 'table'],
      }),
      start: field('start', 'Start', 'datetime', timeOperators),
      end: field('end', 'End', 'datetime', timeOperators),
      attendees: field('attendees', 'Attendees', 'number', numberOperators),
      location: field('location', 'Location', 'string', stringOperators, { nullable: true }),
      project: field('project', 'Project', 'string', stringOperators),
      description: field('description', 'Description', 'string', stringOperators, {
        nullable: true,
        containsExternalContent: true,
        sensitive: true,
      }),
      related_doc_id: field('related_doc_id', 'Related Doc', 'id', stringOperators, { nullable: true }),
    },
  },
  'synthetic.drive.files': {
    sourceId: asSourceId('synthetic.drive.files'),
    displayName: 'Synthetic Drive Files',
    description: 'Deterministic fixture Drive metadata for Stage 0.',
    itemIdField: 'id',
    capabilities: ['local-only', 'supports-pushdown-filter', 'supports-pushdown-sort'],
    defaultRenderer: 'list',
    defaultSort: { field: 'modified_at', direction: 'desc' },
    fields: {
      id: field('id', 'File ID', 'id', stringOperators),
      name: field('name', 'Name', 'string', stringOperators, {
        containsExternalContent: true,
        rendererHints: ['list', 'table'],
      }),
      modified_at: field('modified_at', 'Modified At', 'datetime', timeOperators),
      owner: field('owner', 'Owner', 'string', stringOperators),
      mime_type: field('mime_type', 'MIME Type', 'string', stringOperators),
      project: field('project', 'Project', 'string', stringOperators),
      url: field('url', 'URL', 'url', stringOperators),
      stale: field('stale', 'Stale', 'boolean', booleanOperators),
    },
  },
  'synthetic.tasks': {
    sourceId: asSourceId('synthetic.tasks'),
    displayName: 'Synthetic Tasks',
    description: 'Deterministic fixture tasks for Stage 0.',
    itemIdField: 'id',
    capabilities: ['local-only', 'supports-pushdown-filter', 'supports-pushdown-sort'],
    defaultRenderer: 'list',
    defaultSort: { field: 'due_at', direction: 'asc' },
    fields: {
      id: field('id', 'Task ID', 'id', stringOperators),
      title: field('title', 'Title', 'string', stringOperators, {
        containsExternalContent: true,
        rendererHints: ['list', 'table'],
      }),
      due_at: field('due_at', 'Due At', 'datetime', timeOperators, { nullable: true }),
      completed: field('completed', 'Completed', 'boolean', booleanOperators),
      project: field('project', 'Project', 'string', stringOperators),
      priority: field('priority', 'Priority', 'enum', stringOperators),
      updated_at: field('updated_at', 'Updated At', 'datetime', timeOperators),
    },
  },
};

export const STAGE_0_RENDERERS = ['list', 'count', 'table', 'raw'] as const;
