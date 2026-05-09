# Design Review: SysGP — Sistema Gerenciador de Projetos

Revisado contra: análise de código + tokens do globals.css  
Filosofia adotada: **Dark Professional / Enterprise SaaS** — dark palette com azul e teal como acentos, tipografia Inter + Plus Jakarta Sans, motion suave via Framer Motion  
Data: 2026-05-09  
Nota: screenshots visuais pendentes (browser automatizado indisponível no ambiente atual)

---

## Resumo

O sistema tem uma estética dark consistente e bem executada, com tokens CSS bem definidos, componentes reutilizáveis e motion com propósito. Os pontos críticos são: **ausência de navegação mobile** (a sidebar colapsa mas não vira um drawer no mobile), **labels sem `htmlFor`** nas páginas de login e formulários custom, e **falta de loading skeleton** na seção de audit log da página de Configurações. O dashboard é o componente mais polido do sistema.

---

## Must Fix

### 1. Sem navegação mobile — sidebar quebra em telas < 640px

**Arquivo:** `components/layout/Sidebar.tsx`, `app/(app)/layout.tsx`

A sidebar tem `width: 232px` (ou `60px` colapsada) via Framer Motion, mas não tem nenhum breakpoint mobile. Em telas < 640px a sidebar ocupa espaço horizontal e o conteúdo fica comprimido ou cortado — não existe hamburger menu, drawer ou bottom tab. A página não tem `@media (max-width)` nenhum no layout.

**Fix:** Adicionar um drawer mobile. Em `< md`, ocultar a sidebar (`hidden md:flex`), mostrar um botão hamburger no Topbar, e abrir a sidebar como overlay com `position: fixed` e backdrop.

---

### 2. Labels sem `htmlFor` — falha de acessibilidade

**Arquivo:** `app/(auth)/login/page.tsx` linhas 112–133

Os inputs de e-mail e senha no login têm `<label>` mas sem `htmlFor`, e os inputs não têm `id`. Clicar no label não foca o campo (falha UX + acessibilidade WCAG 1.3.1).

```tsx
// Atual — label e input desconectados
<label className="...">E-mail</label>
<input type="email" ... />

// Fix
<label htmlFor="email" className="...">E-mail</label>
<input id="email" type="email" ... />
```

**Fix:** Adicionar `id="email"` + `htmlFor="email"` no campo de e-mail, e `id="senha"` + `htmlFor="senha"` no campo de senha. O componente `Input.tsx` já gera `inputId` automaticamente — usar o componente `<Input>` em vez de inputs custom.

---

### 3. Botão "mostrar/ocultar senha" inacessível por teclado

**Arquivo:** `app/(auth)/login/page.tsx` linha 149

O botão de olho tem `tabIndex={-1}`, o que significa que usuários de teclado não conseguem ativar a visibilidade da senha.

**Fix:** Remover `tabIndex={-1}`. Adicionar `aria-label="Mostrar senha"` / `"Ocultar senha"` alternando conforme o estado.

---

### 4. Ausência de loading state no audit log (Configurações)

**Arquivo:** `app/(app)/admin/configuracoes/page.tsx`

A seção de Auditoria não tem skeleton loader enquanto os logs carregam — o usuário vê a tabela vazia e ela preencheha sem transição. O Dashboard e a tabela de Usuários têm skeletons; Configurações não tem.

**Fix:** Adicionar state `loadingLogs` (booleano), iniciado em `true`, e renderizar linhas skeleton enquanto verdadeiro — mesmo padrão dos `SkeletonRow` do Dashboard.

---

## Should Fix

### 5. Sidebar não é `<aside>` com `aria-label`

**Arquivo:** `components/layout/Sidebar.tsx` linha 65

O elemento raiz é `<motion.aside>` — bom. Mas falta `aria-label="Navegação principal"` para identificá-lo aos leitores de tela (há dois elementos `<nav>` na página: sidebar e breadcrumb do Topbar).

**Fix:**
```tsx
<motion.aside aria-label="Navegação principal" ...>
```

---

### 6. Breadcrumb no Topbar sem `aria-label`

**Arquivo:** `components/layout/Topbar.tsx` linha 42

`<nav>` do breadcrumb não tem `aria-label`, o que cria ambiguidade com a `<nav>` da sidebar.

**Fix:** `<nav aria-label="Breadcrumb">` e envolver os crumbs em `<ol>/<li>` para semântica correta.

---

### 7. Ícones sem texto alternativo para leitores de tela

**Arquivo:** vários — Sidebar, Topbar, botões com apenas ícone

O botão de colapso da sidebar (`ChevronLeft/Right`) não tem `aria-label`. O botão de logout só tem label quando a sidebar não está colapsada.

**Fix:**
```tsx
// Botão colapsar
<button aria-label={collapsed ? "Expandir menu" : "Recolher menu"} ...>

// Botão logout (já tem title quando collapsed, mas title não é suficiente)
<button aria-label="Sair" ...>
```

---

### 8. Tendências (trend) usam hex hardcoded em vez de tokens

**Arquivo:** `components/ui/Card.tsx` linha 101

```tsx
// Hardcoded — não usa os tokens CSS
trend.value >= 0 ? "text-[#34D399]" : "text-[#F87171]"

// Correto — usa os tokens definidos em globals.css
trend.value >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"
```

Menor impacto visual, mas gera inconsistência se as cores de token mudarem.

---

### 9. Formulários inline nas páginas (login, modal de usuário) não usam o componente `<Input>`

**Arquivo:** `app/(auth)/login/page.tsx` — inputs feitos à mão com classes duplicadas

O componente `components/ui/Input.tsx` já tem todos os estilos corretos (focus ring, erro, label com `htmlFor`). O login recria a mesma lógica de forma manual. Isso gera drift quando o design do input evoluir.

**Fix:** Migrar os campos do login para `<Input>` do design system.

---

### 10. `handleSubmit` no modal de usuário sem try/catch

**Arquivo:** `app/(app)/usuarios/page.tsx` linhas 64–79

A função `handleSubmit` faz `await res.json()` sem try/catch. Se o servidor retornar HTML de erro, a chamada lança `SyntaxError` não capturado — podendo crashar o componente.

**Fix:**
```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  try {
    const res = await fetch("/api/usuarios", { ... });
    const data = await res.json();
    if (!res.ok) { toast("error", data.error || "Erro ao criar usuário"); return; }
    toast("success", "Usuário criado com sucesso!");
    setModalOpen(false);
    carregar();
  } catch {
    toast("error", "Erro de comunicação com o servidor");
  } finally {
    setSubmitting(false);
  }
}
```

---

## Could Improve

### 11. Sidebar colapsada perde contexto visual — sem tooltip nativo

**Arquivo:** `components/layout/Sidebar.tsx`

Quando colapsada, os links têm `title={collapsed ? item.label : undefined}` — o tooltip nativo do browser funciona mas tem aparência inconsistente. Uma alternativa mais polida seria um tooltip custom ao hover.

---

### 12. Empty state das páginas (Projetos, Atividades) é texto puro

**Arquivo:** `app/(app)/projetos/page.tsx`, `app/(app)/atividades/page.tsx`

O empty state é apenas `<p>Nenhum projeto encontrado</p>`. O Dashboard tem um empty state mais rico (ícone + texto + subtítulo). Padronizar para o padrão do Dashboard melhora a percepção de cuidado com o produto.

---

### 13. Importação duplicada de `lucide-react` em usuarios/page.tsx

**Arquivo:** `app/(app)/usuarios/page.tsx` linhas 5 e 13

```tsx
import { Plus, Search, RefreshCw } from "lucide-react";  // linha 5
import { Eye, EyeOff } from "lucide-react";               // linha 13
```

Pode ser consolidado em uma única importação.

---

### 14. `user` importado mas não usado em usuarios/page.tsx

**Arquivo:** `app/(app)/usuarios/page.tsx` linha 46

`const { user } = useAuth();` — `user` nunca é referenciado no JSX ou em funções. Pode gerar warning do TypeScript/ESLint e confunde quem mantém o código.

---

### 15. CSS `@import` fora de ordem gera warning de build

**Arquivo:** `app/globals.css` linha 2

O `@import url('https://fonts.googleapis.com/...')` aparece depois de `@import "tailwindcss"`, gerando o warning:

```
@import rules must precede all rules aside from @charset and @layer statements
```

**Fix:** Mover o import das fontes para a primeira linha:

```css
@import url('https://fonts.googleapis.com/...');
@import "tailwindcss";
```

---

## O que está bem

- **Tokens CSS coerentes:** todas as cores, sombras, raios e fontes estão em variáveis CSS em `globals.css`. A consistência visual entre páginas é resultado direto disso.
- **Componente Button exemplar:** todos os estados (hover, focus-visible com ring, active, disabled, loading com spinner) estão implementados corretamente. É o componente mais acessível do sistema.
- **Skeleton loaders no Dashboard:** a experiência de carregamento do Dashboard é suave e profissional — SkeletonCard e SkeletonRow evitam o salto de layout.
- **`prefers-reduced-motion` implementado:** `globals.css` tem o media query correto que desativa todas as animações para usuários que preferem.
- **Motion com propósito:** stagger nos stat cards, fade nas linhas de atividade e animação de entrada do modal têm timing coerente e não são decorativos.
- **Sidebar colapsável com animação suave:** a transição de largura via Framer Motion é fluida e o logo/labels somem de forma elegante com AnimatePresence.
- **`bigintToString` agora trata Dates corretamente:** o fix da sessão anterior resolve o erro `toLocaleDateString is not a function` de forma elegante.
- **Error boundary implementado:** `app/(app)/error.tsx` garante que erros de render não resultam em tela branca.
