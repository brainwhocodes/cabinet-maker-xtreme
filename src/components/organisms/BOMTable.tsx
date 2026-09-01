'use client';
import { type BOMDataStatus, computeProjectBOM } from '@/domain/bom/compute-project-bom';
import type { RoomProject } from '@/domain/geometry/models';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { SolarIcon } from '../atoms/SolarIcon';

const STATUS_PRESENTATION: Record<
  BOMDataStatus,
  { label: string; variant: 'success' | 'primary' | 'warning' | 'neutral' }
> = {
  verified: { label: 'Verified', variant: 'success' },
  'search-only': { label: 'Search only', variant: 'primary' },
  stale: { label: 'Stale', variant: 'warning' },
  'user-entered': { label: 'User entered', variant: 'neutral' },
  'material-estimate': { label: 'Material estimate', variant: 'neutral' },
};

export function BOMTable({ project }: { project: RoomProject }) {
  const {
    rows,
    subtotalCabinets,
    subtotalTrim,
    subtotalHardware,
    subtotalInstallation,
    knownGrandTotalUSD,
    unpricedRowCount,
    countertopSqFt,
    nextRecommendedAction,
  } = computeProjectBOM(project);

  const handleExportCSV = () => {
    const header =
      'Category,SKU,Item Name,Quantity,Unit,Unit Price USD,Total Price USD,Data Status,Verified At,Notes\n';
    const body = rows
      .map(
        (row) =>
          `"${row.category}","${row.sku ?? ''}","${row.name}",${row.quantity},"${row.unit}","${row.unitPriceUSD ?? 'Unavailable'}","${row.totalPriceUSD ?? 'Unavailable'}","${row.dataStatus}","${row.verifiedAt ?? ''}","${row.notes ?? ''}"`,
      )
      .join('\n');

    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cabinet_BOM_${project.name.replace(/\s+/g, '_')}_r${project.revision}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bom-container p-4">
      {/* Header & Export Actions */}
      <div className="page-heading-row is-flex is-align-items-center is-justify-content-between mb-4 no-print">
        <div>
          <h2 className="title is-4 mb-1">Itemized Bill of Materials (BOM)</h2>
          <p className="subtitle is-6 has-text-grey">
            Planning quantities, estimated prices, and transparent retailer data status.
          </p>
        </div>

        <div className="page-heading-actions buttons mb-0">
          <Button size="sm" icon="solar:printer-linear" onClick={() => window.print()}>
            Print BOM
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon="solar:download-linear"
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Pricing Summary Cards */}
      <div className="columns is-variable is-3 mb-4">
        <div className="column">
          <div className="box p-3 has-background-white">
            <span className="is-size-7 has-text-grey uppercase">
              Cabinets ({project.cabinets.length})
            </span>
            <div className="is-size-5 has-text-weight-bold has-text-primary">
              ${subtotalCabinets.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="column">
          <div className="box p-3 has-background-white">
            <span className="is-size-7 has-text-grey uppercase">Trim & Fillers</span>
            <div className="is-size-5 has-text-weight-bold has-text-dark">
              ${subtotalTrim.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="column">
          <div className="box p-3 has-background-white">
            <span className="is-size-7 has-text-grey uppercase">Hardware & Fasteners</span>
            <div className="is-size-5 has-text-weight-bold has-text-dark">
              ${(subtotalHardware + subtotalInstallation).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="column">
          <div className="box p-3 has-background-primary-light">
            <span className="is-size-7 has-text-weight-bold has-text-primary-dark uppercase">
              Known-price total
            </span>
            <div className="is-size-4 has-text-weight-bold has-text-primary-dark">
              ${knownGrandTotalUSD.toFixed(2)}
            </div>
            <span className="is-size-7 has-text-primary-dark">
              {unpricedRowCount} unpriced {unpricedRowCount === 1 ? 'row' : 'rows'}
            </span>
          </div>
        </div>
      </div>

      {nextRecommendedAction && (
        <p className="notification is-light is-size-7 mb-4">{nextRecommendedAction}</p>
      )}

      {/* BOM Table */}
      <div className="table-container box p-0 mb-4" style={{ borderRadius: 8, overflow: 'hidden' }}>
        <table className="table is-fullwidth is-striped is-hoverable mb-0">
          <thead className="has-background-light">
            <tr>
              <th>Item / SKU</th>
              <th>Category</th>
              <th>Data status</th>
              <th className="has-text-centered">Qty</th>
              <th className="has-text-right">Unit Price</th>
              <th className="has-text-right">Line Total</th>
              <th className="no-print">Procurement Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = STATUS_PRESENTATION[row.dataStatus];
              return (
                <tr key={row.id}>
                  <td>
                    <div className="has-text-weight-bold is-size-7">{row.name}</div>
                    <span className="is-size-7 has-text-grey">Reference #{row.sku}</span>
                    {row.notes && (
                      <div className="is-size-7 has-text-grey-dark font-italic">{row.notes}</div>
                    )}
                  </td>
                  <td>
                    <Badge variant="neutral" size="sm">
                      {row.category}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                    {row.verifiedAt && (
                      <div className="is-size-7 has-text-grey mt-1">{row.verifiedAt}</div>
                    )}
                  </td>
                  <td className="has-text-centered tabular-nums is-size-7 font-weight-bold">
                    {row.quantity} {row.unit}
                  </td>
                  <td className="has-text-right tabular-nums is-size-7">
                    {row.unitPriceUSD === null ? 'Unavailable' : `$${row.unitPriceUSD.toFixed(2)}`}
                  </td>
                  <td className="has-text-right tabular-nums has-text-weight-bold is-size-7">
                    {row.totalPriceUSD === null
                      ? 'Unavailable'
                      : `$${row.totalPriceUSD.toFixed(2)}`}
                  </td>
                  <td className="no-print">
                    {row.retailSearchUrl ? (
                      <a
                        href={row.retailSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button is-small is-link is-outlined"
                      >
                        <SolarIcon name="solar:cart-large-linear" size={14} className="mr-1" />
                        <span>Search Retailer</span>
                      </a>
                    ) : (
                      <span className="is-size-7 has-text-grey">Unavailable</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Countertop & Disclaimer Notes */}
      <div className="box p-3 is-size-7 has-background-light">
        <p className="mb-1">
          <strong>Countertop material:</strong> <strong>{countertopSqFt} sq ft</strong> from
          explicit countertop elements, including configured waste.
        </p>
        <p className="has-text-grey mb-0">
          <em>Data note:</em> “Search only” rows are planning matches, not verified products, live
          inventory, or current prices. Confirm the model, finish, price, and availability with the
          retailer before ordering. CabCraft 3D is not affiliated with The Home Depot.
        </p>
      </div>
    </div>
  );
}
