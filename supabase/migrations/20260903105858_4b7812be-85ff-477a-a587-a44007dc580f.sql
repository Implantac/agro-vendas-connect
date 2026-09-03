-- Enums
CREATE TYPE public.membership_request_status AS ENUM ('payment_pending','in_review','approved','rejected','cancelled');
CREATE TYPE public.membership_payment_status AS ENUM ('pending','paid','failed','refunded');

-- Planos
CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  target_role public.member_role NOT NULL DEFAULT 'buyer',
  price numeric(12,2) NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly',
  benefits_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlight boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.membership_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;
GRANT ALL ON public.membership_plans TO service_role;

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos sao publicos" ON public.membership_plans
  FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
CREATE POLICY "Admins gerenciam planos" ON public.membership_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_membership_plans_updated BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Solicitacoes
CREATE TABLE public.membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.membership_plans(id),
  requested_role public.member_role NOT NULL DEFAULT 'buyer',
  status public.membership_request_status NOT NULL DEFAULT 'payment_pending',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_status public.membership_payment_status NOT NULL DEFAULT 'pending',
  payment_reference text,
  paid_at timestamptz,
  applicant_notes text,
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_requests_user ON public.membership_requests(user_id);
CREATE INDEX idx_membership_requests_status ON public.membership_requests(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_requests TO authenticated;
GRANT ALL ON public.membership_requests TO service_role;

ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membro ve suas solicitacoes" ON public.membership_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Membro cria sua solicitacao" ON public.membership_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins atualizam solicitacoes" ON public.membership_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_membership_requests_updated BEFORE UPDATE ON public.membership_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Confirmacao de pagamento (simulada) pelo proprio solicitante
CREATE OR REPLACE FUNCTION public.confirm_membership_payment(_request_id uuid, _method text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.membership_requests WHERE id = _request_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _owner <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão para esta solicitação';
  END IF;

  UPDATE public.membership_requests
     SET payment_method = COALESCE(_method, payment_method),
         payment_status = 'paid',
         paid_at = now(),
         status = 'in_review',
         updated_at = now()
   WHERE id = _request_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(), 'membership_payment_confirmed', 'membership_request', _request_id,
          jsonb_build_object('method', _method));
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_membership_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_membership_payment(uuid, text) TO authenticated;

-- Cancelamento pelo solicitante
CREATE OR REPLACE FUNCTION public.cancel_membership_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid; _status public.membership_request_status;
BEGIN
  SELECT user_id, status INTO _owner, _status FROM public.membership_requests WHERE id = _request_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _owner <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão para esta solicitação';
  END IF;
  IF _status <> 'payment_pending' THEN
    RAISE EXCEPTION 'Somente solicitações aguardando pagamento podem ser canceladas';
  END IF;

  UPDATE public.membership_requests SET status = 'cancelled', updated_at = now() WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_membership_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_membership_request(uuid) TO authenticated;

-- Analise pelo admin
CREATE OR REPLACE FUNCTION public.admin_review_membership(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid; _role public.member_role;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem analisar solicitações'; END IF;

  SELECT user_id, requested_role INTO _user, _role FROM public.membership_requests WHERE id = _request_id;
  IF _user IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;

  UPDATE public.membership_requests
     SET status = CASE WHEN _approve THEN 'approved'::public.membership_request_status
                       ELSE 'rejected'::public.membership_request_status END,
         review_notes = _notes,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _request_id;

  IF _approve THEN
    UPDATE public.profiles
       SET status = 'approved', role = _role, rejection_reason = NULL, updated_at = now()
     WHERE id = _user;
  ELSE
    UPDATE public.profiles
       SET status = 'rejected', rejection_reason = _notes, updated_at = now()
     WHERE id = _user;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (_user, 'membership',
          CASE WHEN _approve THEN 'Membresia aprovada' ELSE 'Membresia recusada' END,
          COALESCE(_notes, CASE WHEN _approve THEN 'Seu acesso ao DDP AGRO foi liberado.' ELSE 'Sua solicitação foi recusada.' END),
          CASE WHEN _approve THEN '/app' ELSE '/cadastro-rejeitado' END);

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'membership_approved' ELSE 'membership_rejected' END,
          'membership_request', _request_id, jsonb_build_object('notes', _notes, 'role', _role));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_membership(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_membership(uuid, boolean, text) TO authenticated;

-- Planos iniciais
INSERT INTO public.membership_plans (code, name, description, target_role, price, period, benefits_json, highlight, sort_order)
VALUES
 ('buyer_essencial','Comprador Essencial','Acesso completo ao catálogo verificado e negociação direta com vendedores aprovados.','buyer',149.00,'monthly',
  '["Ficha técnica e fotos de todos os implementos","Propostas e chat com vendedores","Histórico de negociações auditável"]'::jsonb,false,1),
 ('seller_pro','Vendedor Pro','Para revendas e produtores que anunciam máquinas usadas com regularidade.','seller',349.00,'monthly',
  '["Até 30 anúncios ativos","Propostas recebidas e contrapropostas","Painel de desempenho dos anúncios","Selo de vendedor verificado"]'::jsonb,true,2),
 ('seller_premium','Vendedor Premium','Máxima exposição para grandes revendas de implementos agrícolas.','seller',749.00,'monthly',
  '["Anúncios ilimitados","Destaque na vitrine e no catálogo","Atendimento prioritário","Relatórios avançados"]'::jsonb,false,3);