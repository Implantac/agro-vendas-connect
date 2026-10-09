-- =====================================================================
-- Auditoria fase 2b: consultas e escritas que ainda não eram atômicas
-- ou que cresciam sem limite.
--  1. Índice (conversation_id, created_at) para prévia e histórico.
--  2. set_listing_cover: troca a foto de capa numa só transação.
--  3. conversation_last_messages: última mensagem por conversa, sem
--     trazer o histórico inteiro para a lista de conversas.
-- Funções SECURITY INVOKER: valem as políticas RLS de quem chama.
-- =====================================================================

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. Capa do anúncio: exatamente uma foto de capa, trocada atomicamente
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_listing_cover(_listing_id uuid, _media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Checagem explícita: sem ela, quem não é dono teria o UPDATE filtrado pelo RLS
  -- e a função terminaria sem erro e sem trocar nada.
  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = _listing_id
      AND (l.seller_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Somente o vendedor do anúncio pode trocar a foto de capa';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.listing_media m
    WHERE m.id = _media_id AND m.listing_id = _listing_id
  ) THEN
    RAISE EXCEPTION 'Foto não pertence a este anúncio';
  END IF;

  UPDATE public.listing_media
     SET is_cover = (id = _media_id)
   WHERE listing_id = _listing_id
     AND is_cover IS DISTINCT FROM (id = _media_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_listing_cover(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_listing_cover(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_listing_cover(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Última mensagem de cada conversa (uma linha por conversa)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.conversation_last_messages(_conversation_ids uuid[])
RETURNS TABLE (conversation_id uuid, content text, created_at timestamptz, sender_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.conversation_id)
         m.conversation_id, m.content, m.created_at, m.sender_id
    FROM public.messages m
   WHERE m.conversation_id = ANY (_conversation_ids)
   ORDER BY m.conversation_id, m.created_at DESC, m.id DESC;
$$;

REVOKE ALL ON FUNCTION public.conversation_last_messages(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.conversation_last_messages(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.conversation_last_messages(uuid[]) TO authenticated;
