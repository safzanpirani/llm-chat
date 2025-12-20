import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MODEL_LIST, type ModelId } from '@/lib/models'

interface ModelSelectorProps {
  value: ModelId
  onChange: (value: ModelId) => void
  disabled?: boolean
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {MODEL_LIST.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  model.provider === 'anthropic' ? 'bg-orange-500' : 'bg-blue-500'
                }`}
              />
              {model.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
