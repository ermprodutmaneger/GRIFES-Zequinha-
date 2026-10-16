/**
 * Formatadores e utilitarios de interface (pt-BR).
 */

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** 289.9 -> "R$ 289,90" */
export function brl(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'R$ 0,00';
  return formatadorMoeda.format(numero);
}

/** 289.9 -> "289,90" (sem simbolo) */
export function brlSemSimbolo(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0,00';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 1 -> "1x de R$ 159,90 sem juros" */
export function parcelas(valor, quantidade = 3) {
  const numero = Number(valor) || 0;
  const qtd = Math.min(Math.max(1, quantidade), 12);
  const valorParcela = numero / qtd;
  return `${qtd}x de ${brl(valorParcela)} sem juros`;
}

/** 2026-10-16T12:00:00Z -> "16/10/2026 as 09:00" */
export function dataHora(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return String(iso);
  return `${data.toLocaleDateString('pt-BR')} as ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** 2026-10-20 -> "20/10/2026" */
export function data(iso) {
  if (!iso) return '—';
  const partes = String(iso).slice(0, 10).split('-');
  if (partes.length !== 3) return String(iso);
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** Escapa texto que vai para innerHTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* --------------------------- mascaras de input --------------------------- */

export function mascaraCep(valor) {
  return String(valor).replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function mascaraCpf(valor) {
  return String(valor)
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraTelefone(valor) {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Aplica uma funcao de mascara enquanto o usuario digita. */
export function aplicarMascara(input, funcao) {
  if (!input) return;
  const atualizar = () => {
    const posicaoNoFim = input.selectionStart === input.value.length;
    input.value = funcao(input.value);
    if (posicaoNoFim) input.setSelectionRange(input.value.length, input.value.length);
  };
  input.addEventListener('input', atualizar);
  atualizar();
}

/* ------------------------------- validacoes ------------------------------ */

export function cpfValido(cpf) {
  const digitos = String(cpf).replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcular = (fatia) => {
    let soma = 0;
    for (let i = 0; i < fatia.length; i += 1) {
      soma += Number(fatia[i]) * (fatia.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(digitos.slice(0, 9)) === Number(digitos[9]) && calcular(digitos.slice(0, 10)) === Number(digitos[10]);
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(email).trim());
}

/** Valor numerico a partir de input com mascara. */
export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Le o valor de um input pelo id (string vazia se nao existir). */
export function valorDe(id) {
  const elemento = document.getElementById(id);
  return elemento ? String(elemento.value || '').trim() : '';
}

/** Cria elementos a partir de HTML (com esc nas partes dinamicas). */
export function html(strings, ...valores) {
  return strings.reduce((acc, parte, indice) => acc + parte + (valores[indice] ?? ''), '');
}
