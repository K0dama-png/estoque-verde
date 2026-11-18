import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Batch, Market, Movement, Product } from '../types';
import { daysUntilExpiry, formatCurrency, formatDate, formatDateTime, isLowStock } from '../utils';

const escapeHtml = (value: string | number) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const documentShell = (market: Market, title: string, subtitle: string, content: string) => `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 16mm 13mm 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #173228; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.45; }
      .header { border-bottom: 3px solid #16794A; padding-bottom: 12px; margin-bottom: 18px; }
      .brand { color: #16794A; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
      h1 { margin: 5px 0 3px; color: #0E5A36; font-size: 24px; line-height: 1.15; }
      .subtitle { color: #688077; font-size: 10px; }
      .market { margin-top: 10px; color: #173228; font-size: 11px; font-weight: 700; }
      .meta { color: #688077; font-size: 9px; margin-top: 2px; }
      .summary { display: flex; gap: 8px; margin: 0 0 18px; }
      .summary-card { flex: 1; min-height: 58px; padding: 10px; border: 1px solid #DDE7E2; border-radius: 8px; background: #F6F8F7; }
      .summary-label { color: #688077; font-size: 8px; font-weight: 700; text-transform: uppercase; }
      .summary-value { margin-top: 4px; color: #0E5A36; font-size: 17px; font-weight: 800; }
      h2 { margin: 18px 0 8px; color: #173228; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      th { padding: 7px 6px; color: #FFFFFF; background: #16794A; font-size: 8px; text-align: left; text-transform: uppercase; }
      td { padding: 7px 6px; border-bottom: 1px solid #DDE7E2; vertical-align: top; word-wrap: break-word; }
      tr:nth-child(even) td { background: #F6F8F7; }
      .number { text-align: right; }
      .status-ok { color: #168A50; font-weight: 700; }
      .status-warning { color: #9A6500; font-weight: 700; }
      .status-danger { color: #D84C4C; font-weight: 700; }
      .empty { padding: 18px; color: #688077; text-align: center; border: 1px dashed #DDE7E2; }
      .note { margin-top: 14px; padding: 10px; color: #426356; background: #F0FAF5; border-left: 3px solid #16794A; }
      .footer { position: fixed; right: 0; bottom: -10mm; left: 0; color: #688077; font-size: 8px; text-align: center; }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="brand">LoteCerto</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
      <div class="market">${escapeHtml(market.name)}</div>
      <div class="meta">${escapeHtml(market.document)} - ${escapeHtml(market.city)} - Gerado em ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
    </header>
    ${content}
    <footer class="footer">LoteCerto - ${escapeHtml(title)}</footer>
  </body>
</html>`;

export function createStockReportHtml(market: Market, products: Product[], batches: Batch[]) {
  const totalUnits = products.reduce((total, product) => total + product.quantity, 0);
  const stockValue = products.reduce((total, product) => total + product.quantity * product.price, 0);
  const lowStockCount = products.filter(isLowStock).length;
  const expiringCount = batches.filter((batch) => batch.quantity > 0 && daysUntilExpiry(batch.expiryDate) <= 30).length;

  const rows = products.flatMap((product) => {
    const productBatches = batches
      .filter((batch) => batch.productId === product.id && batch.quantity > 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    if (!productBatches.length) {
      return `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>Sem lote</td><td class="number">0</td><td>-</td><td class="status-danger">Sem estoque</td></tr>`;
    }
    return productBatches.map((batch) => {
      const days = daysUntilExpiry(batch.expiryDate);
      const status = days < 0
        ? '<span class="status-danger">Vencido</span>'
        : days <= 30
          ? `<span class="status-warning">Vence em ${days} dia${days === 1 ? '' : 's'}</span>`
          : '<span class="status-ok">Regular</span>';
      return `<tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${escapeHtml(batch.code)}</td>
        <td class="number">${escapeHtml(batch.quantity)} ${escapeHtml(product.unit)}</td>
        <td>${escapeHtml(formatDate(batch.expiryDate))}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');
  }).join('');

  const content = `
    <section class="summary">
      <div class="summary-card"><div class="summary-label">Produtos ativos</div><div class="summary-value">${products.length}</div></div>
      <div class="summary-card"><div class="summary-label">Unidades em estoque</div><div class="summary-value">${totalUnits}</div></div>
      <div class="summary-card"><div class="summary-label">Valor estimado</div><div class="summary-value">${escapeHtml(formatCurrency(stockValue))}</div></div>
      <div class="summary-card"><div class="summary-label">Alertas</div><div class="summary-value">${lowStockCount + expiringCount}</div></div>
    </section>
    <h2>Posicao do estoque por lote</h2>
    ${rows ? `<table><thead><tr><th style="width:22%">Produto</th><th style="width:15%">Categoria</th><th style="width:16%">Lote</th><th style="width:12%" class="number">Saldo</th><th style="width:15%">Validade</th><th style="width:20%">Situacao</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nenhum produto cadastrado.</div>'}
    <div class="note">A situacao de estoque baixo considera o minimo configurado em cada produto. Os alertas de validade consideram lotes vencidos ou com vencimento em ate 30 dias.</div>`;

  return documentShell(market, 'Relatorio de estoque', 'Posicao atual de produtos, saldos, lotes e validades', content);
}

export function createMovementReportHtml(market: Market, movements: Movement[], periodLabel: string) {
  const entries = movements.filter((movement) => movement.type === 'ENTRY');
  const exits = movements.filter((movement) => movement.type === 'EXIT');
  const entryUnits = entries.reduce((total, movement) => total + movement.quantity, 0);
  const exitUnits = exits.reduce((total, movement) => total + movement.quantity, 0);
  const rows = [...movements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((movement) => `<tr>
      <td>${escapeHtml(formatDateTime(movement.createdAt))}</td>
      <td><span class="${movement.type === 'ENTRY' ? 'status-ok' : 'status-danger'}">${movement.type === 'ENTRY' ? 'Entrada' : `Saida - ${{ SALE: 'Venda', LOSS: 'Perda', EXPIRY: 'Vencimento', DAMAGE: 'Avaria', INTERNAL_USE: 'Consumo interno', ADJUSTMENT: 'Ajuste' }[movement.exitReason ?? 'SALE']}`}</span></td>
      <td>${escapeHtml(movement.productName)}</td>
      <td>${escapeHtml(movement.batchCode ?? '-')}</td>
      <td class="number">${escapeHtml(movement.quantity)}</td>
      <td>${escapeHtml(movement.userName)}</td>
    </tr>`).join('');

  const content = `
    <section class="summary">
      <div class="summary-card"><div class="summary-label">Movimentacoes</div><div class="summary-value">${movements.length}</div></div>
      <div class="summary-card"><div class="summary-label">Entradas</div><div class="summary-value">+${entryUnits}</div></div>
      <div class="summary-card"><div class="summary-label">Saidas</div><div class="summary-value">-${exitUnits}</div></div>
    </section>
    <h2>Historico de entradas e saidas</h2>
    ${rows ? `<table><thead><tr><th style="width:16%">Data</th><th style="width:11%">Tipo</th><th style="width:24%">Produto</th><th style="width:17%">Lote(s)</th><th style="width:10%" class="number">Qtd.</th><th style="width:22%">Responsavel</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nenhuma movimentacao registrada.</div>'}
    <div class="note">Nas saidas, os lotes apresentados seguem a baixa automatica FEFO: primeiro vence, primeiro sai.</div>`;

  return documentShell(market, 'Relatorio de movimentacoes', `Historico de entradas e saidas - ${periodLabel}`, content);
}

async function generateAndShare(html: string, dialogTitle: string) {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

export const generateStockPdf = (market: Market, products: Product[], batches: Batch[]) =>
  generateAndShare(createStockReportHtml(market, products, batches), 'Compartilhar relatório de estoque');

export const generateMovementPdf = (market: Market, movements: Movement[], periodLabel: string) =>
  generateAndShare(createMovementReportHtml(market, movements, periodLabel), 'Compartilhar relatório de movimentações');
