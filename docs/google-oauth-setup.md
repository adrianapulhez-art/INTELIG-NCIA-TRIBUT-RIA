# Configuração do Login Social com Google (OAuth2)

Este documento orienta como ativar as credenciais do Google OAuth2 no backend PocketBase (Skip Cloud) para que o botão **"Continuar com Google"** da página `/auth` funcione em produção.

---

## 1. Obter Credenciais no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um existente (ex: `IT — Inteligência Tributária`).
3. No menu lateral, acesse **APIs e Serviços** > **Tela de consentimento OAuth** (_OAuth consent screen_):
   - Tipo de usuário: **Externo** (_External_).
   - Preencha o nome do app (`IT — Inteligência Tributária`), e-mail de suporte e e-mail do desenvolvedor.
   - Adicione os escopos básicos: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. Em **APIs e Serviços** > **Credenciais**:
   - Clique em **+ Criar credenciais** > **ID do cliente OAuth** (_OAuth client ID_).
   - Tipo de aplicativo: **Aplicativo da Web** (_Web application_).
   - Nome: `PocketBase Web Client`.
   - **Origens JavaScript autorizadas** (_Authorized JavaScript origins_):
     - `https://replicacao-de-projeto-aed7f.shrd00.internal.goskip.dev` (Backend)
     - A URL pública do seu frontend (ex: seu domínio final ou URL de preview do Skip).
   - **URIs de redirecionamento autorizados** (_Authorized redirect URIs_):
     - Adicione a URL de redirecionamento do PocketBase:
       `https://replicacao-de-projeto-aed7f.shrd00.internal.goskip.dev/api/oauth2-redirect`
5. Copie o **Client ID** e o **Client Secret** gerados.

---

## 2. Ativar o Provedor Google no PocketBase

1. Acesse o painel de administração do PocketBase (`/_/`).
2. Acesse a coleção **`users`** (engrenagem de configurações da coleção / Auth providers).
3. Na seção **OAuth2**, clique no provedor **Google**:
   - Marque como **Habilitado** (_Enabled_).
   - Cole o **Client ID**.
   - Cole o **Client Secret**.
4. Clique em **Salvar** (_Save changes_).

---

## 3. Comportamento no App

- Ao clicar em **"Continuar com Google"**, o SDK do PocketBase abre o popup oficial do Google.
- Após o consentimento do usuário, a conta é criada e vinculada automaticamente pelo PocketBase.
- O app sincroniza o nome e foto do perfil do Google com a conta no PocketBase e redireciona o usuário para a área protegida (`/app`).
- Caso o provedor ainda não tenha sido ativado no painel, o sistema exibe uma notificação amigável informando a disponibilidade temporária, sem quebrar o formulário de login por e-mail e senha.
