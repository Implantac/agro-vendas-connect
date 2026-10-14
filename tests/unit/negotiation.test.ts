import { describe, expect, test } from "bun:test";
import {
  allowedActions,
  lastCounterFrom,
  roleIn,
  turnOf,
} from "../../src/lib/permissions/negotiation";

// Espelha tests/sql/turno_resposta_proposta.sql: a regra de vez no cliente não pode divergir do banco.
const party = { userId: "", buyerId: "comprador", sellerId: "vendedor" };
const asBuyer = { ...party, userId: "comprador" };
const asSeller = { ...party, userId: "vendedor" };
const asThird = { ...party, userId: "terceiro" };
const future = new Date(Date.now() + 48 * 36e5).toISOString();
const past = new Date(Date.now() - 36e5).toISOString();

describe("turno de resposta (respond_proposal)", () => {
  test("proposta aberta: a vez é do vendedor", () => {
    expect(turnOf("open")).toBe("seller");
  });

  test("proposta aberta: comprador só pode cancelar", () => {
    expect(allowedActions("open", future, asBuyer)).toEqual(["cancelled"]);
  });

  test("proposta aberta: vendedor aceita, recusa ou contrapõe, sem cancelar", () => {
    expect(allowedActions("open", future, asSeller)).toEqual(["accepted", "rejected", "countered"]);
  });

  test("vendedor contrapôs: a vez é do comprador", () => {
    expect(turnOf("countered", "seller")).toBe("buyer");
    expect(allowedActions("countered", future, asBuyer, "seller")).toEqual([
      "accepted",
      "rejected",
      "countered",
      "cancelled",
    ]);
    expect(allowedActions("countered", future, asSeller, "seller")).toEqual([]);
  });

  test("comprador contrapôs de volta: a vez volta ao vendedor (ida e volta)", () => {
    expect(turnOf("countered", "buyer")).toBe("seller");
    expect(allowedActions("countered", future, asSeller, "buyer")).toEqual([
      "accepted",
      "rejected",
      "countered",
    ]);
    expect(allowedActions("countered", future, asBuyer, "buyer")).toEqual(["cancelled"]);
  });

  test("contraproposta sem histórico conhecido: vez indefinida, ninguém responde", () => {
    expect(turnOf("countered", null)).toBeNull();
    expect(allowedActions("countered", future, asSeller, null)).toEqual([]);
    expect(allowedActions("countered", future, asBuyer, null)).toEqual(["cancelled"]);
  });

  test("terceiro não age", () => {
    expect(roleIn(asThird)).toBeNull();
    expect(allowedActions("open", future, asThird)).toEqual([]);
  });

  test("proposta expirada ou encerrada não tem ações", () => {
    expect(allowedActions("open", past, asSeller)).toEqual([]);
    expect(allowedActions("accepted", future, asSeller)).toEqual([]);
    expect(allowedActions("cancelled", future, asBuyer)).toEqual([]);
  });
});

describe("lastCounterFrom (histórico de eventos)", () => {
  test("usa a última contraproposta, não a primeira", () => {
    const events = [
      { event_type: "created", actor_id: "comprador" },
      { event_type: "countered", actor_id: "vendedor" },
      { event_type: "countered", actor_id: "comprador" },
    ];
    expect(lastCounterFrom(events, party)).toBe("buyer");
  });

  test("ignora eventos que não são contraproposta", () => {
    const events = [
      { event_type: "countered", actor_id: "vendedor" },
      { event_type: "message", actor_id: "comprador" },
    ];
    expect(lastCounterFrom(events, party)).toBe("seller");
  });

  test("sem contraproposta, retorna null", () => {
    expect(lastCounterFrom([{ event_type: "created", actor_id: "comprador" }], party)).toBeNull();
    expect(lastCounterFrom([], party)).toBeNull();
  });

  test("ator desconhecido não recebe a vez", () => {
    expect(lastCounterFrom([{ event_type: "countered", actor_id: "sistema" }], party)).toBeNull();
  });
});
