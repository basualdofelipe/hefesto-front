import { render, screen } from '@testing-library/react';

import { DesglosePanel } from '@/components/calculator/DesglosePanel';
import type {
  CalcInverseResult,
  CalcResult,
} from '@/components/calculator/types';

// SPEC case A: 87000 selling price, shipping charged 7315 / shipping cost 7315,
// Pago Nube tarjeta 7 d (3.49%), 1 installment, plan Esencial, IVA 21, IIBB 3.5.
const CASE_A: CalcResult = {
  customerTotal: 94315,
  baseRate: 3.49,
  rateWithIva: 4.2229,
  gatewayFee: 3982.8281,
  installmentRate: 0,
  financingCost: 0,
  cpt: 0,
  taxableBase: 77946.281,
  ivaDebit: 16368.719,
  ivaCreditProduct: 1372.2408,
  ivaCreditGatewayFee: 691.2346,
  ivaCreditShipping: 1269.5455,
  ivaNet: 13035.6981,
  iibbWithholding: 3301.025,
  netReceived: 87031.1469,
  productCostWithIva: 7906.7208,
  shippingCost: 7315,
  realProfit: 58773.73,
  marginPercent: 67.56,
};

const RI_NOTE = 'La fórmula asume Responsable Inscripto (IVA débito/crédito).';

describe('DesglosePanel', () => {
  it('forward, 1 installment: shipping rows, tax labels, accented IVA rows, RI note, profit', () => {
    render(<DesglosePanel result={CASE_A} mode='forward' installments={1} />);

    // R1: shipping IVA credit (+, indented) and shipping cost (-) rows from result.*
    const ivaCreditShippingRow = screen.getByText('IVA crédito envío');
    expect(ivaCreditShippingRow).toBeInTheDocument();
    expect(ivaCreditShippingRow.parentElement).toHaveTextContent('+$ 1.269,55');
    expect(ivaCreditShippingRow.parentElement).toHaveClass('pl-4');

    const shippingCostRow = screen.getByText('Costo de envío (con IVA)');
    expect(shippingCostRow).toBeInTheDocument();
    expect(shippingCostRow.parentElement).toHaveTextContent('-$ 7.315,00');

    // R3: tax label on every row
    const gatewayRow = screen.getByText(/Comisión pasarela/);
    expect(gatewayRow).toHaveTextContent('+ IVA');
    expect(gatewayRow).toHaveTextContent('3.49%');
    expect(gatewayRow).toHaveTextContent('4.22%');

    expect(screen.getByText(/CPT Tiendanube/)).toHaveTextContent(
      'según config',
    );

    // Accented pre-existing rows
    expect(screen.getByText('IVA débito fiscal')).toBeInTheDocument();
    expect(screen.getByText('IVA crédito producto')).toBeInTheDocument();
    expect(screen.getByText('IVA crédito comisión')).toBeInTheDocument();

    // No installments row with a single installment
    expect(screen.queryByText(/Financiación cuotas/)).not.toBeInTheDocument();

    // R4: Responsable Inscripto note
    expect(screen.getByText(RI_NOTE)).toBeInTheDocument();

    // Profit row: es-AR formatting of realProfit and marginPercent
    const profitRow = screen.getByText(/GANANCIA REAL/);
    expect(profitRow).toHaveTextContent('67.56%');
    expect(profitRow.parentElement).toHaveTextContent('58.773,73');

    // Forward mode never shows the inverse header
    expect(
      screen.queryByText('Precio de venta necesario'),
    ).not.toBeInTheDocument();
  });

  it('forward, 3 installments: installments row labelled "según config"', () => {
    render(
      <DesglosePanel
        result={{ ...CASE_A, installmentRate: 12.5, financingCost: 11789.38 }}
        mode='forward'
        installments={3}
      />,
    );

    const installmentsRow = screen.getByText(/Financiación cuotas/);
    expect(installmentsRow).toHaveTextContent('12.50%');
    expect(installmentsRow).toHaveTextContent('según config');
    expect(installmentsRow.parentElement).toHaveTextContent('-$ 11.789,38');
  });

  it('inverse: shows requiredSellingPrice as "Precio de venta necesario"', () => {
    const inverse: CalcInverseResult = {
      ...CASE_A,
      requiredSellingPrice: 87000,
    };

    render(<DesglosePanel result={inverse} mode='inverse' installments={1} />);

    const header = screen.getByText('Precio de venta necesario');
    expect(header).toBeInTheDocument();
    expect(header.parentElement).toHaveTextContent('$ 87.000,00');
  });
});
