import { describe, expect, test } from "bun:test";
import {
  offeredPlans,
  postSignupDestination,
  requiresMembershipPayment,
} from "../../src/lib/buyer-access";

describe("requiresMembershipPayment", () => {
  test("só vendedor paga membresia", () => {
    expect(requiresMembershipPayment("seller")).toBe(true);
  });

  test("comprador, admin e papel desconhecido não pagam", () => {
    expect(requiresMembershipPayment("buyer")).toBe(false);
    expect(requiresMembershipPayment("admin")).toBe(false);
    expect(requiresMembershipPayment("")).toBe(false);
    expect(requiresMembershipPayment(null)).toBe(false);
    expect(requiresMembershipPayment(undefined)).toBe(false);
  });
});

describe("postSignupDestination", () => {
  test("comprador vai para análise, sem passar por membresia", () => {
    expect(postSignupDestination("buyer")).toEqual({ to: "/aguardando-aprovacao" });
  });

  test("vendedor segue para membresia", () => {
    expect(postSignupDestination("seller")).toEqual({ to: "/membresia" });
  });
});

describe("offeredPlans", () => {
  const plans = [
    { code: "comprador_essencial", target_role: "buyer" },
    { code: "vendedor_pro", target_role: "seller" },
    { code: "premium", target_role: "seller" },
  ];

  test("oferece somente planos de vendedor", () => {
    expect(offeredPlans(plans).map((p) => p.code)).toEqual(["vendedor_pro", "premium"]);
  });

  test("não altera a lista de entrada", () => {
    offeredPlans(plans);
    expect(plans.length).toBe(3);
  });

  test("lista vazia continua vazia", () => {
    expect(offeredPlans([])).toEqual([]);
  });

  test("plano com papel desconhecido não é oferecido", () => {
    expect(offeredPlans([{ target_role: "admin" }])).toEqual([]);
  });
});
