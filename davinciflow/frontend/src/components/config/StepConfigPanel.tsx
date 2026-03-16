import { X } from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import type { StepConfigFieldSchema } from '../../types/pipeline';
import { cn } from '../../utils/cn';

export default function StepConfigPanel() {
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const nodes = usePipelineStore((s) => s.nodes);
  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig);
  const setSelectedNode = usePipelineStore((s) => s.setSelectedNode);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const { definition, config } = node.data;
  const schema = definition.config_schema;

  const handleChange = (key: string, value: string | number | boolean) => {
    updateNodeConfig(node.id, { [key]: value });
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-slate-700/80 bg-slate-900/95">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-100">{definition.name}</h3>
        <button
          onClick={() => setSelectedNode(null)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {Object.entries(schema.properties).map(([key, fieldSchema]) => (
            <ConfigField
              key={key}
              fieldKey={key}
              schema={fieldSchema}
              value={config[key]}
              required={schema.required?.includes(key)}
              onChange={(value) => handleChange(key, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ConfigFieldProps {
  fieldKey: string;
  schema: StepConfigFieldSchema;
  value: string | number | boolean | undefined;
  required?: boolean;
  onChange: (value: string | number | boolean) => void;
}

function ConfigField({ fieldKey, schema, value, required, onChange }: ConfigFieldProps) {
  const labelClasses = 'block text-xs font-medium text-slate-300 mb-1.5';
  const inputClasses = cn(
    'w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100',
    'placeholder:text-slate-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50'
  );

  if (schema.type === 'boolean') {
    return (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-brand-primary focus:ring-brand-primary/50"
        />
        <span className="text-sm text-slate-300">{schema.title}</span>
      </label>
    );
  }

  if (schema.type === 'enum' && schema.enum) {
    return (
      <div>
        <label className={labelClasses}>
          {schema.title}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
          {schema.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === 'number') {
    return (
      <div>
        <label className={labelClasses}>
          {schema.title}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
        <input
          type="number"
          value={value as number ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={schema.placeholder}
          className={inputClasses}
        />
      </div>
    );
  }

  // Default: string / connection
  return (
    <div>
      <label className={labelClasses}>
        {schema.title}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder}
        className={inputClasses}
      />
      {schema.description && (
        <p className="mt-1 text-[11px] text-slate-500">{schema.description}</p>
      )}
    </div>
  );
}
