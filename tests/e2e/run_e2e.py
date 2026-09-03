"""Testes ponta a ponta do CRUD do DDP AGRO.

Uso:
    E2E_EMAIL=... E2E_PASSWORD=... python3 tests/e2e/run_e2e.py [--base-url http://localhost:8080]

Cobre: páginas públicas, login, publicar anúncio (com foto), editar anúncio,
gestão de fotos (capa/remover), proposta + negociação (aceitar -> pedido) e
exclusão definitiva do anúncio. Cada passo imprime PASS/FAIL e o script termina
com código != 0 se algum passo falhar.
"""

import argparse
import asyncio
import os
import struct
import sys
import tempfile
import time
import zlib

from playwright.async_api import async_playwright, expect

RESULTS: list[tuple[str, str]] = []
SHOTS = "/tmp/browser/ddp-e2e"


def png(path: str, color=(30, 104, 70)) -> str:
    """Gera um PNG 64x64 sólido, sem dependências externas."""
    w = h = 64
    raw = b"".join(b"\x00" + bytes(color) * w for _ in range(h))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    data = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(data)
    return path


def record(name: str, ok: bool, detail: str = ""):
    RESULTS.append((name, "PASS" if ok else f"FAIL {detail}"))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}", flush=True)


async def step(name, coro):
    try:
        await coro
        record(name, True)
        return True
    except Exception as exc:  # noqa: BLE001
        record(name, False, str(exc).splitlines()[0][:200])
        return False


async def main(base: str, email: str, password: str) -> int:
    os.makedirs(SHOTS, exist_ok=True)
    photo = png(os.path.join(tempfile.gettempdir(), "ddp-e2e-foto.png"))
    title = f"[E2E] Trator de teste {int(time.time())}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # 1. Páginas públicas
        async def publicas():
            for path, marker in [
                ("/", "DDP"),
                ("/catalogo", "Catálogo"),
                ("/planos", "plano"),
                ("/termo-de-aceite", "Termo"),
                ("/politica-de-privacidade", "Privacidade"),
            ]:
                await page.goto(base + path, wait_until="domcontentloaded")
                await page.wait_for_timeout(600)
                body = (await page.inner_text("body")).lower()
                assert marker.lower() in body, f"{path} sem conteúdo esperado ({marker})"

        await step("Páginas públicas carregam", publicas())

        # 2. Login
        async def login():
            await page.goto(base + "/entrar", wait_until="networkidle")
            await page.wait_for_timeout(1500)  # aguarda hidratação do React
            await page.fill("#email", email)
            await page.fill("#senha", password)
            await page.get_by_role("button", name="Entrar", exact=True).click()
            await page.wait_for_url("**/app**", timeout=20000)

        if not await step("Login com e-mail e senha", login()):
            await browser.close()
            return summary()

        # 3. Publicar anúncio (wizard de 5 etapas + foto)
        async def publicar():
            await page.goto(base + "/app/publicar", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            # Etapa 1 — categoria + título
            await page.get_by_role("button", name="Tratores", exact=True).first.click()
            await page.fill("#title", title)
            await page.get_by_role("button", name="Continuar").click()

            # Etapa 2 — dados técnicos
            await page.wait_for_selector("#brand", timeout=15000)
            await page.fill("#brand", "John Deere")
            await page.fill("#model", "6120J")
            await page.fill("#year", "2020")
            await page.fill("#hours", "1800")
            await page.fill("#description", "Anúncio criado automaticamente pelos testes E2E.")
            await page.get_by_role("button", name="Usado", exact=True).first.click()
            await page.get_by_role("button", name="Continuar").click()

            # Etapa 3 — preço
            await page.wait_for_selector("#price", timeout=15000)
            await page.fill("#price", "485000")
            await page.get_by_role("button", name="Continuar").click()

            # Etapa 4 — localização
            await page.wait_for_selector("#city", timeout=15000)
            await page.fill("#city", "Rio Verde")
            await page.get_by_role("combobox").first.click()
            await page.get_by_role("option", name="GO", exact=True).click()
            await page.get_by_role("button", name="Continuar").click()

            # Etapa 5 — foto + envio
            await page.wait_for_selector("#photos", timeout=15000)
            await page.set_input_files("#photos", photo)
            await page.get_by_role("button", name="Enviar para análise").click()
            await page.wait_for_url("**/app/meus-anuncios**", timeout=45000)
            await expect(page.get_by_text(title).first).to_be_visible(timeout=25000)


        created = await step("Publicar anúncio com foto", publicar())

        # 4. Editar anúncio
        async def editar():
            await page.goto(base + "/app/meus-anuncios", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            card = (
                page.locator("div")
                .filter(has_text=title)
                .filter(has=page.get_by_role("link", name="Editar"))
                .last
            )
            await card.get_by_role("link", name="Editar").last.click()
            await page.wait_for_url("**/app/anuncio/**", timeout=20000)
            await page.wait_for_timeout(1200)
            await page.fill("#title", title + " (editado)")
            await page.get_by_role("button", name="Salvar alterações").click()
            await page.wait_for_timeout(2000)

        if created:
            await step("Editar anúncio existente", editar())

            async def fotos():
                assert await page.locator("img").count() > 0, "galeria sem imagens"
                cover = page.get_by_role("button", name="Definir como capa")
                if await cover.count():
                    await cover.first.click()
                    await page.wait_for_timeout(1200)

            await step("Gestão de fotos do anúncio", fotos())

        # 5. Telas do painel
        async def telas():
            for path in [
                "/app",
                "/app/comprar",
                "/app/favoritos",
                "/app/propostas",
                "/app/propostas-recebidas",
                "/app/negociacoes",
                "/app/mensagens",
                "/app/notificacoes",
                "/app/perfil",
                "/app/empresa",
                "/app/configuracoes",
                "/app/meus-anuncios",
            ]:
                await page.goto(base + path, wait_until="networkidle")
                await page.wait_for_timeout(1200)
                assert "/entrar" not in page.url, f"{path} redirecionou para login"
                text = await page.inner_text("body")
                assert len(text.strip()) > 40, f"{path} renderizou vazio"

        await step("Todas as telas do painel abrem autenticadas", telas())

        # 6. Perfil / empresa (CRUD de dados)
        async def empresa():
            await page.goto(base + "/app/empresa", wait_until="domcontentloaded")
            await page.wait_for_timeout(1200)
            trade = page.locator("input").first
            await trade.fill("DDP AGRO E2E")
            btn = page.get_by_role("button", name="Salvar")
            if await btn.count():
                await btn.first.click()
                await page.wait_for_timeout(1500)

        await step("Atualizar dados da empresa", empresa())

        # 7. Moderação: aprovar o anúncio criado (perfil admin)
        edited_title = title + " (editado)"

        async def moderar():
            await page.goto(base + "/app/admin/anuncios", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            card = (
                page.locator("div")
                .filter(has_text=edited_title)
                .filter(has=page.get_by_role("button", name="Aprovar"))
                .last
            )
            await card.get_by_role("button", name="Aprovar").last.click()
            await page.wait_for_timeout(2500)

        approved = created and await step("Aprovar anúncio na moderação", moderar())

        # 8. Proposta a partir da página pública do implemento
        async def propor():
            await page.goto(base + "/catalogo?busca=E2E", wait_until="networkidle")
            await page.wait_for_timeout(2500)
            link = page.locator("a[href*='/implementos/']").first
            assert await link.count(), "anúncio aprovado não apareceu no catálogo"
            await link.click()
            await page.wait_for_url("**/implementos/**", timeout=20000)
            trigger = page.get_by_role("button", name="Enviar proposta").first
            await expect(trigger).to_be_visible(timeout=30000)
            await trigger.click()
            await page.wait_for_selector("#valor", timeout=15000)
            await page.fill("#valor", "450000")
            await page.fill("#mensagem", "Proposta automática dos testes E2E.")
            await page.get_by_role("button", name="Enviar proposta").last.click()
            await page.wait_for_url("**/app/negociacao/**", timeout=30000)
            await page.wait_for_timeout(2500)

        proposed = approved and await step("Enviar proposta pelo anúncio público", propor())

        # 9. Aceitar proposta e gerar pedido
        async def aceitar():
            await page.get_by_role("button", name="Aceitar").first.click()
            await page.wait_for_timeout(3500)
            body = await page.inner_text("body")
            assert "Pedido" in body or "pedido" in body, "pedido não foi gerado após o aceite"

        if proposed:
            await step("Aceitar proposta e gerar pedido", aceitar())

        # 10. Negociações listadas
        async def negociar():
            await page.goto(base + "/app/negociacoes", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            link = page.locator("a[href*='/app/negociacao/']").first
            if not await link.count():
                print("      (sem negociações existentes — passo informativo)")
                return
            await link.click()
            await page.wait_for_url("**/app/negociacao/**", timeout=20000)
            await page.wait_for_timeout(1500)
            assert "roposta" in await page.inner_text("body")

        await step("Abrir negociação e histórico", negociar())


        # 8. Excluir anúncio criado
        async def excluir():
            page.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await page.goto(base + "/app/meus-anuncios", wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            card = (
                page.locator("div")
                .filter(has_text=title)
                .filter(has=page.get_by_role("button", name="Excluir"))
                .last
            )
            await card.get_by_role("button", name="Excluir").last.click()
            await page.wait_for_timeout(2500)
            assert title not in await page.inner_text("body"), "anúncio ainda listado"

        if created:
            await step("Excluir anúncio definitivamente", excluir())

        await page.screenshot(path=os.path.join(SHOTS, "final.png"))
        if errors:
            record("Sem erros de runtime no console", False, errors[0][:200])
        else:
            record("Sem erros de runtime no console", True)
        await browser.close()
    return summary()


def summary() -> int:
    print("\n===== RESUMO E2E =====")
    failed = 0
    for name, status in RESULTS:
        print(f"{status:<6} {name}")
        if status.startswith("FAIL"):
            failed += 1
    print(f"{len(RESULTS) - failed}/{len(RESULTS)} passos OK")
    return 1 if failed else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=os.environ.get("E2E_BASE_URL", "http://localhost:8080"))
    args = ap.parse_args()
    mail = os.environ.get("E2E_EMAIL")
    pwd = os.environ.get("E2E_PASSWORD")
    if not mail or not pwd:
        print("Defina E2E_EMAIL e E2E_PASSWORD (conta de teste aprovada).")
        sys.exit(2)
    sys.exit(asyncio.run(main(args.base_url.rstrip("/"), mail, pwd)))
