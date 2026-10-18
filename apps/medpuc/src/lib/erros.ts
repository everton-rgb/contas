/**
 * erros.ts — tradução de erros do Supabase para mensagens em português.
 *
 * Os serviços lançam ErroApp; a interface só mostra `mensagem`. O erro
 * original fica em `causa` para depuração.
 */

const NOMES_RECURSO: Record<string, string> = {
  disciplinas: 'disciplinas',
  eventos: 'eventos',
  conteudos: 'conteúdos',
  tarefas: 'tarefas',
  anotacoes: 'anotações',
};

const ERROS_AUTH: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos na sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'A senha é fraca. Use pelo menos 8 caracteres, com letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  over_email_send_rate_limit: 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  email_address_invalid: 'Este endereço de e-mail não é aceito.',
  signup_disabled: 'Novos cadastros estão temporariamente desativados.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  session_expired: 'Sua sessão expirou. Entre novamente.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
  otp_expired: 'O link expirou ou já foi usado. Solicite um novo.',
  reauthentication_needed: 'Por segurança, entre novamente antes de trocar a senha.',
  user_not_found: 'Conta não encontrada.',
  validation_failed: 'Verifique os dados informados.',
};

const ERROS_BANCO: Record<string, string> = {
  '42501': 'Você não tem permissão para realizar esta ação.',
  '23503': 'O item relacionado não existe mais. Atualize a página e tente de novo.',
  '23505': 'Este item já existe.',
  '23514': 'Algum campo tem um valor inválido.',
  '22001': 'Um dos textos ultrapassa o tamanho permitido.',
  '22007': 'Data ou horário inválido.',
  '22008': 'Data ou horário inválido.',
  '22P02': 'Algum campo tem um valor inválido.',
  PGRST116: 'Item não encontrado. Ele pode ter sido excluído.',
  PGRST301: 'Sua sessão expirou. Entre novamente.',
  PGRST303: 'Sua sessão expirou. Entre novamente.',
};

export const MENSAGEM_PADRAO = 'Algo deu errado. Tente novamente em instantes.';
export const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Verifique sua conexão.';

export class ErroApp extends Error {
  readonly codigo?: string;
  readonly causa?: unknown;

  constructor(mensagem: string, opcoes: { codigo?: string; causa?: unknown } = {}) {
    super(mensagem);
    this.name = 'ErroApp';
    this.codigo = opcoes.codigo;
    this.causa = opcoes.causa;
  }
}

type ErroBruto = { message?: unknown; code?: unknown; details?: unknown; name?: unknown; status?: unknown };

function mensagemDeLimite(detalhes: unknown): string {
  try {
    const d = JSON.parse(String(detalhes)) as { recurso?: string; limite?: number };
    const recurso = NOMES_RECURSO[d.recurso ?? ''] ?? 'itens';
    return `Seu plano atual permite até ${d.limite} ${recurso}. Remova algum item ou conheça os planos.`;
  } catch {
    return 'Você atingiu o limite do seu plano atual.';
  }
}

export function traduzirErro(erro: unknown): string {
  if (erro instanceof ErroApp) return erro.message;
  if (!erro || typeof erro !== 'object') return MENSAGEM_PADRAO;

  const e = erro as ErroBruto;
  const codigo = typeof e.code === 'string' ? e.code : undefined;
  const mensagem = typeof e.message === 'string' ? e.message : '';

  if (codigo === 'MP001') return mensagemDeLimite(e.details);
  if (codigo && ERROS_AUTH[codigo]) return ERROS_AUTH[codigo];
  if (codigo && ERROS_BANCO[codigo]) return ERROS_BANCO[codigo];

  // Mensagens antigas do Auth, sem código.
  if (/invalid login credentials/i.test(mensagem)) return ERROS_AUTH.invalid_credentials;
  if (/email not confirmed/i.test(mensagem)) return ERROS_AUTH.email_not_confirmed;
  if (/already registered/i.test(mensagem)) return ERROS_AUTH.user_already_exists;
  if (/password should be|password is too weak/i.test(mensagem)) return ERROS_AUTH.weak_password;
  if (/for security purposes/i.test(mensagem) || e.status === 429) return ERROS_AUTH.over_request_rate_limit;
  if (/jwt expired/i.test(mensagem)) return ERROS_AUTH.session_expired;

  if (
    e.name === 'AuthRetryableFetchError' ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(mensagem)
  ) {
    return MENSAGEM_SEM_CONEXAO;
  }

  return MENSAGEM_PADRAO;
}

/** Converte qualquer erro em ErroApp, preservando o original. */
export function comoErroApp(erro: unknown): ErroApp {
  if (erro instanceof ErroApp) return erro;
  const codigo = erro && typeof erro === 'object' && typeof (erro as ErroBruto).code === 'string'
    ? ((erro as ErroBruto).code as string)
    : undefined;
  return new ErroApp(traduzirErro(erro), { codigo, causa: erro });
}
