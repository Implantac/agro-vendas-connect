import { supabase } from "@/integrations/supabase/client";

export interface MachineFormValues {
  categoryId: string;
  brand: string;
  model: string;
  year: string;
  condition: string;
  hours: string;
  serialNumber: string;
  city: string;
  state: string;
  availability: string;
}

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Disponível para negociação",
  negotiating: "Em negociação",
  sold: "Vendida",
  unavailable: "Indisponível no momento",
};

export const EMPTY_MACHINE: MachineFormValues = {
  categoryId: "",
  brand: "",
  model: "",
  year: "",
  condition: "used",
  hours: "",
  serialNumber: "",
  city: "",
  state: "",
  availability: "available",
};

function toRow(ownerId: string, values: MachineFormValues) {
  return {
    owner_id: ownerId,
    category_id: values.categoryId || null,
    brand: values.brand.trim() || null,
    model: values.model.trim() || null,
    manufacture_year: values.year ? Number(values.year) : null,
    condition: (values.condition || "used") as "new" | "semi_new" | "used",
    hours_used: values.hours ? Number(values.hours) : null,
    serial_number: values.serialNumber.trim() || null,
    city: values.city.trim() || null,
    state: values.state || null,
    availability: values.availability || "available",
  };
}

export async function fetchMachinesWithListings(ownerId: string) {
  const { data, error } = await supabase
    .from("machines")
    .select(
      "id,category_id,brand,model,manufacture_year,condition,hours_used,serial_number,city,state,availability,verification_status,verified_at,updated_at,categories(name),listings(id,title,status)",
    )
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMachine(ownerId: string, values: MachineFormValues) {
  const { error } = await supabase.from("machines").insert(toRow(ownerId, values));
  if (error) throw error;
}

export async function updateMachine(
  machineId: string,
  ownerId: string,
  values: MachineFormValues,
) {
  const { error } = await supabase
    .from("machines")
    .update(toRow(ownerId, values))
    .eq("id", machineId)
    .eq("owner_id", ownerId);
  if (error) throw error;
}

export async function deleteMachine(machineId: string, ownerId: string) {
  const { error } = await supabase
    .from("machines")
    .delete()
    .eq("id", machineId)
    .eq("owner_id", ownerId);
  if (error) throw error;
}
