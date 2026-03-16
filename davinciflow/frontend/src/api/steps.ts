import { apiClient } from './client';
import type { StepCategory, StepDefinition } from '../types/pipeline';

export interface StepLibrary {
  sources: StepDefinition[];
  transforms: StepDefinition[];
  sinks: StepDefinition[];
}

const FALLBACK_LIBRARY: StepLibrary = {
  sources: [
    {
      type: 'postgres_source',
      name: 'Postgres Reader',
      description: 'Ingest rows from transactional PostgreSQL tables.',
      category: 'source',
      icon: 'database',
      config_schema: {
        required: ['connection', 'table'],
        properties: {
          connection: {
            type: 'connection',
            title: 'Connection',
            description: 'Saved database connection used to read source records.',
            connectionType: 'postgres'
          },
          table: {
            type: 'string',
            title: 'Table',
            placeholder: 'public.orders'
          },
          batch_size: {
            type: 'number',
            title: 'Batch Size',
            default: 1000
          }
        }
      }
    },
    {
      type: 'csv_source',
      name: 'CSV Loader',
      description: 'Read delimited files from object storage or uploads.',
      category: 'source',
      icon: 'cloud',
      config_schema: {
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            title: 'File Path',
            placeholder: 's3://landing/orders.csv'
          },
          delimiter: {
            type: 'string',
            title: 'Delimiter',
            default: ','
          },
          has_headers: {
            type: 'boolean',
            title: 'Has Headers',
            default: true
          }
        }
      }
    },
    {
      type: 'api_source',
      name: 'REST Poller',
      description: 'Pull incremental payloads from an authenticated REST API.',
      category: 'source',
      icon: 'cable',
      config_schema: {
        required: ['connection', 'resource'],
        properties: {
          connection: {
            type: 'connection',
            title: 'Connection',
            connectionType: 'api'
          },
          resource: {
            type: 'string',
            title: 'Resource Path',
            placeholder: '/v1/orders'
          },
          pagination: {
            type: 'enum',
            title: 'Pagination',
            enum: ['cursor', 'page', 'none'],
            default: 'cursor'
          }
        }
      }
    }
  ],
  transforms: [
    {
      type: 'filter_rows',
      name: 'Filter Rows',
      description: 'Apply SQL-like predicates before downstream processing.',
      category: 'transform',
      icon: 'filter',
      config_schema: {
        required: ['condition'],
        properties: {
          condition: {
            type: 'string',
            title: 'Condition',
            placeholder: "status = 'paid'"
          },
          strict_mode: {
            type: 'boolean',
            title: 'Strict Mode',
            default: false
          }
        }
      }
    },
    {
      type: 'join_streams',
      name: 'Join Streams',
      description: 'Blend two inputs with a keyed join and match strategy.',
      category: 'transform',
      icon: 'arrow-right-left',
      config_schema: {
        required: ['join_key'],
        properties: {
          join_key: {
            type: 'string',
            title: 'Join Key',
            placeholder: 'customer_id'
          },
          join_type: {
            type: 'enum',
            title: 'Join Type',
            enum: ['inner', 'left', 'right', 'full'],
            default: 'left'
          }
        }
      }
    },
    {
      type: 'aggregate_rows',
      name: 'Aggregate',
      description: 'Compute metrics by group before loading to the warehouse.',
      category: 'transform',
      icon: 'sigma',
      config_schema: {
        required: ['group_by', 'metric'],
        properties: {
          group_by: {
            type: 'string',
            title: 'Group By',
            placeholder: 'region'
          },
          metric: {
            type: 'string',
            title: 'Metric',
            placeholder: 'sum(revenue)'
          },
          keep_detail: {
            type: 'boolean',
            title: 'Keep Detail Rows',
            default: false
          }
        }
      }
    }
  ],
  sinks: [
    {
      type: 'snowflake_sink',
      name: 'Snowflake Loader',
      description: 'Write curated batches into Snowflake with merge support.',
      category: 'sink',
      icon: 'database',
      config_schema: {
        required: ['connection', 'target_table'],
        properties: {
          connection: {
            type: 'connection',
            title: 'Connection',
            connectionType: 'snowflake'
          },
          target_table: {
            type: 'string',
            title: 'Target Table',
            placeholder: 'analytics.orders'
          },
          mode: {
            type: 'enum',
            title: 'Load Mode',
            enum: ['append', 'merge', 'truncate'],
            default: 'merge'
          }
        }
      }
    },
    {
      type: 's3_sink',
      name: 'S3 Export',
      description: 'Persist transformed outputs into partitioned object storage.',
      category: 'sink',
      icon: 'cloud',
      config_schema: {
        required: ['connection', 'bucket_path'],
        properties: {
          connection: {
            type: 'connection',
            title: 'Connection',
            connectionType: 's3'
          },
          bucket_path: {
            type: 'string',
            title: 'Bucket Path',
            placeholder: 's3://curated/orders/'
          },
          format: {
            type: 'enum',
            title: 'Format',
            enum: ['parquet', 'csv', 'json'],
            default: 'parquet'
          }
        }
      }
    },
    {
      type: 'webhook_sink',
      name: 'Webhook Notify',
      description: 'Push operational signals into downstream systems via HTTP.',
      category: 'sink',
      icon: 'send',
      config_schema: {
        required: ['endpoint'],
        properties: {
          endpoint: {
            type: 'string',
            title: 'Endpoint',
            placeholder: 'https://ops.example.com/hook'
          },
          retry_count: {
            type: 'number',
            title: 'Retry Count',
            default: 3
          },
          enabled: {
            type: 'boolean',
            title: 'Enabled',
            default: true
          }
        }
      }
    }
  ]
};

export function getDefaultStepConfig(definition: StepDefinition) {
  return Object.entries(definition.config_schema.properties).reduce<
    Record<string, string | number | boolean>
  >((config, [key, schema]) => {
    if (schema.default !== undefined) {
      config[key] = schema.default;
    } else if (schema.type === 'boolean') {
      config[key] = false;
    } else if (schema.type === 'number') {
      config[key] = 0;
    } else {
      config[key] = '';
    }

    return config;
  }, {});
}

export function flattenStepLibrary(library: StepLibrary) {
  return [...library.sources, ...library.transforms, ...library.sinks];
}

export function categoryToNodeType(category: StepCategory) {
  if (category === 'source') {
    return 'sourceNode';
  }

  if (category === 'sink') {
    return 'sinkNode';
  }

  return 'transformNode';
}

export async function getStepLibrary() {
  try {
    const response = await apiClient.get<StepLibrary>('/steps/library');
    return response.data;
  } catch {
    return FALLBACK_LIBRARY;
  }
}
