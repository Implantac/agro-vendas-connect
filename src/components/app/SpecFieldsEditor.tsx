import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { specFieldsFor } from "@/features/listings/category-specs";

interface Props {
  categorySlug: string | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * Campos de características técnicas da categoria escolhida.
 * Compartilhado entre publicar e editar anúncio para não divergirem.
 */
export function SpecFieldsEditor({ categorySlug, values, onChange }: Props) {
  const fields = specFieldsFor(categorySlug);
  return (
    <div className="space-y-3">
      <Label>Características técnicas</Label>
      <p className="text-xs text-muted-foreground">
        {categorySlug
          ? "Só aparecem os itens que fazem sentido para a categoria escolhida. Deixe em branco o que não souber — nada é preenchido automaticamente."
          : "Escolha a categoria para ver as características específicas. Os itens abaixo valem para qualquer máquina."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`spec-${field.key}`}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </Label>
            {field.options ? (
              <Select
                value={values[field.key] ?? ""}
                onValueChange={(v) => onChange(field.key, v)}
              >
                <SelectTrigger id={`spec-${field.key}`}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`spec-${field.key}`}
                value={values[field.key] ?? ""}
                inputMode={field.numeric ? "numeric" : "text"}
                placeholder={field.placeholder ?? ""}
                onChange={(e) =>
                  onChange(
                    field.key,
                    field.numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value,
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
