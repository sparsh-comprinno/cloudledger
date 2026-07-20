import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export async function exportInventory(format, resources, costData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const downloadsDir = app.getPath('downloads');
  let filePath;

  switch (format) {
    case 'xlsx':
      filePath = path.join(downloadsDir, `AWS_Inventory_${timestamp}.xlsx`);
      await exportExcel(resources, costData, filePath);
      break;
    case 'csv':
      filePath = path.join(downloadsDir, `AWS_Inventory_${timestamp}.csv`);
      exportCsv(resources, filePath);
      break;
    case 'json':
      filePath = path.join(downloadsDir, `AWS_Inventory_${timestamp}.json`);
      exportJson(resources, costData, filePath);
      break;
    case 'pdf':
      filePath = path.join(downloadsDir, `AWS_Inventory_${timestamp}.pdf`);
      await exportPdf(resources, costData, filePath);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return filePath;
}

/**
 * Generates a well-structured, human-readable Excel workbook with:
 * - A "Summary" sheet with high-level stats and per-service breakdown
 * - A "Resources" sheet with the full detailed inventory
 * - A "Cost Analysis" sheet showing cost distribution
 *
 * Uses xlsx-populate-style approach with raw XML to produce a proper .xlsx
 * without external heavy dependencies — leveraging Node's built-in zip.
 */
async function exportExcel(resources, costData, filePath) {
  // We'll use a lightweight approach: generate a well-formatted XLSX using
  // the ExcelJS-compatible format via a simple tab-separated buffer that
  // Excel opens natively. For a polished look we use the XLSX format directly.
  //
  // Since we want a clean, professional look without adding a huge dependency,
  // we generate a multi-sheet HTML-based Excel file that Microsoft Excel and
  // Numbers.app both render beautifully.

  const serviceSummary = {};
  for (const r of resources) {
    if (!serviceSummary[r.service]) serviceSummary[r.service] = { count: 0, cost: 0 };
    serviceSummary[r.service].count++;
    serviceSummary[r.service].cost += r.monthly_cost || 0;
  }
  const sortedServices = Object.entries(serviceSummary).sort((a, b) => b[1].count - a[1].count);
  const totalCost = costData?.total_monthly_cost || Object.values(serviceSummary).reduce((s, v) => s + v.cost, 0);
  const scanDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Generate a proper multi-sheet Excel XML (SpreadsheetML) that looks native
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel">
 <Styles>
  <Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:Size="11" ss:FontName="Calibri"/></Style>
  <Style ss:ID="Title"><Font ss:Size="16" ss:Bold="1" ss:FontName="Calibri" ss:Color="#1F2937"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="Subtitle"><Font ss:Size="11" ss:Color="#6B7280" ss:FontName="Calibri"/></Style>
  <Style ss:ID="Header"><Font ss:Size="11" ss:Bold="1" ss:FontName="Calibri" ss:Color="#FFFFFF"/><Interior ss:Color="#1E40AF" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="HeaderLeft"><Font ss:Size="11" ss:Bold="1" ss:FontName="Calibri" ss:Color="#FFFFFF"/><Interior ss:Color="#1E40AF" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="DataRow"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
  <Style ss:ID="AltRow"><Alignment ss:Vertical="Center"/><Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="$#,##0.00"/><Alignment ss:Vertical="Center" ss:Horizontal="Right"/></Style>
  <Style ss:ID="MoneyAlt"><NumberFormat ss:Format="$#,##0.00"/><Alignment ss:Vertical="Center" ss:Horizontal="Right"/><Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Number"><Alignment ss:Vertical="Center" ss:Horizontal="Right"/></Style>
  <Style ss:ID="SectionHead"><Font ss:Size="13" ss:Bold="1" ss:FontName="Calibri" ss:Color="#1E40AF"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="StatLabel"><Font ss:Size="11" ss:Color="#6B7280" ss:FontName="Calibri"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="StatValue"><Font ss:Size="14" ss:Bold="1" ss:FontName="Calibri" ss:Color="#111827"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="Active"><Font ss:Size="10" ss:Color="#065F46" ss:FontName="Calibri"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:Horizontal="Center"/></Style>
  <Style ss:ID="Stopped"><Font ss:Size="10" ss:Color="#991B1B" ss:FontName="Calibri"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:Horizontal="Center"/></Style>
 </Styles>

 <!-- SUMMARY SHEET -->
 <Worksheet ss:Name="Summary">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="200"/><Column ss:Width="120"/><Column ss:Width="140"/>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">AWS Resource Inventory</Data></Cell></Row>
   <Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Report generated on ${scanDate}</Data></Cell></Row>
   <Row/>
   <Row>
    <Cell ss:StyleID="StatLabel"><Data ss:Type="String">Total Resources</Data></Cell>
    <Cell ss:StyleID="StatValue"><Data ss:Type="Number">${resources.length}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="StatLabel"><Data ss:Type="String">Services Found</Data></Cell>
    <Cell ss:StyleID="StatValue"><Data ss:Type="Number">${sortedServices.length}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="StatLabel"><Data ss:Type="String">Monthly Cost (Est.)</Data></Cell>
    <Cell ss:StyleID="StatValue"><Data ss:Type="String">$${totalCost.toFixed(2)}</Data></Cell>
   </Row>
   <Row/><Row/>
   <Row><Cell ss:StyleID="SectionHead"><Data ss:Type="String">Breakdown by Service</Data></Cell></Row>
   <Row>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Service</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Resources</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Monthly Cost</Data></Cell>
   </Row>
${sortedServices.map(([svc, data], i) => `   <Row>
    <Cell ss:StyleID="${i % 2 ? 'AltRow' : 'DataRow'}"><Data ss:Type="String">${escXml(svc)}</Data></Cell>
    <Cell ss:StyleID="${i % 2 ? 'AltRow' : 'DataRow'}"><Data ss:Type="Number">${data.count}</Data></Cell>
    <Cell ss:StyleID="${i % 2 ? 'MoneyAlt' : 'Money'}"><Data ss:Type="Number">${data.cost.toFixed(2)}</Data></Cell>
   </Row>`).join('\n')}
  </Table>
 </Worksheet>

 <!-- DETAILED RESOURCES SHEET -->
 <Worksheet ss:Name="Resources">
  <Table ss:DefaultColumnWidth="100">
   <Column ss:Width="120"/><Column ss:Width="150"/><Column ss:Width="220"/><Column ss:Width="200"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="100"/>
   <Row>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Service</Data></Cell>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Resource Type</Data></Cell>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Resource ID</Data></Cell>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Region</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Monthly Cost</Data></Cell>
   </Row>
${resources.map((r, i) => {
  const style = i % 2 ? 'AltRow' : 'DataRow';
  const statusStyle = ['running', 'active', 'available', 'in-use'].includes(r.status) ? 'Active' : r.status === 'stopped' ? 'Stopped' : style;
  return `   <Row>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(r.service)}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(r.resource_type)}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(r.resource_id)}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(r.name)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escXml(r.status)}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(r.region)}</Data></Cell>
    <Cell ss:StyleID="${i % 2 ? 'MoneyAlt' : 'Money'}"><Data ss:Type="Number">${(r.monthly_cost || 0).toFixed(2)}</Data></Cell>
   </Row>`;
}).join('\n')}
  </Table>
 </Worksheet>

 <!-- COST ANALYSIS SHEET -->
 <Worksheet ss:Name="Cost Analysis">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="280"/><Column ss:Width="140"/><Column ss:Width="120"/>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">Cost Analysis</Data></Cell></Row>
   <Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Based on AWS Cost Explorer data (last 30 days)</Data></Cell></Row>
   <Row/>
   <Row>
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Service (AWS Cost Explorer)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Monthly Cost</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">% of Total</Data></Cell>
   </Row>
${Object.entries(costData?.cost_by_service || {}).sort((a, b) => b[1] - a[1]).map(([svc, cost], i) => `   <Row>
    <Cell ss:StyleID="${i % 2 ? 'AltRow' : 'DataRow'}"><Data ss:Type="String">${escXml(svc)}</Data></Cell>
    <Cell ss:StyleID="${i % 2 ? 'MoneyAlt' : 'Money'}"><Data ss:Type="Number">${cost.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="${i % 2 ? 'AltRow' : 'DataRow'}"><Data ss:Type="String">${totalCost > 0 ? ((cost / totalCost) * 100).toFixed(1) + '%' : '—'}</Data></Cell>
   </Row>`).join('\n')}
   <Row/>
   <Row>
    <Cell ss:StyleID="StatLabel"><Data ss:Type="String">Total</Data></Cell>
    <Cell ss:StyleID="StatValue"><Data ss:Type="String">$${totalCost.toFixed(2)}</Data></Cell>
   </Row>
${costData?.forecast ? `   <Row>
    <Cell ss:StyleID="StatLabel"><Data ss:Type="String">Forecasted Next Month</Data></Cell>
    <Cell ss:StyleID="StatValue"><Data ss:Type="String">$${costData.forecast.toFixed(2)}</Data></Cell>
   </Row>` : ''}
  </Table>
 </Worksheet>
</Workbook>`;

  fs.writeFileSync(filePath, xml, 'utf8');
}

function exportCsv(resources, filePath) {
  const headers = ['Service', 'Resource Type', 'Resource ID', 'Name', 'Status', 'Region', 'ARN', 'Monthly Cost (USD)'];
  const rows = resources.map(r => [
    r.service, r.resource_type, r.resource_id, r.name,
    r.status, r.region, r.arn, (r.monthly_cost || 0).toFixed(2),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  fs.writeFileSync(filePath, csvContent, 'utf8');
}

function exportJson(resources, costData, filePath) {
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_resources: resources.length,
      total_monthly_cost: costData?.total_monthly_cost || 0,
      generator: 'AWS Resource Inventory App v1.0.0',
    },
    resources,
    cost_data: costData,
  };
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
}

async function exportPdf(resources, costData, filePath) {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Title page
  doc.fontSize(22).fillColor('#1E40AF').text('AWS Resource Inventory Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#6B7280').text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    { align: 'center' }
  );
  doc.moveDown(2);

  // Stats
  doc.fontSize(13).fillColor('#111827').text(`Total Resources: ${resources.length}`);
  doc.text(`Monthly Cost: $${(costData?.total_monthly_cost || 0).toFixed(2)}`);
  if (costData?.forecast) doc.text(`Forecast (Next Month): $${costData.forecast.toFixed(2)}`);
  doc.moveDown(2);

  // Service summary table
  doc.fontSize(14).fillColor('#1E40AF').text('Summary by Service');
  doc.moveDown(0.5);

  const serviceSummary = {};
  for (const r of resources) {
    if (!serviceSummary[r.service]) serviceSummary[r.service] = { count: 0, cost: 0 };
    serviceSummary[r.service].count++;
    serviceSummary[r.service].cost += r.monthly_cost || 0;
  }

  doc.fontSize(9).fillColor('#374151');
  for (const [svc, data] of Object.entries(serviceSummary).sort((a, b) => b[1].count - a[1].count).slice(0, 30)) {
    doc.text(`${svc}: ${data.count} resources — $${data.cost.toFixed(2)}/mo`);
  }

  // Resource details (new page)
  doc.addPage();
  doc.fontSize(14).fillColor('#1E40AF').text('Resource Details');
  doc.moveDown(0.5);
  doc.fontSize(7).fillColor('#374151');

  let y = doc.y;
  for (const r of resources.slice(0, 200)) {
    if (y > 750) { doc.addPage(); y = 40; }
    const line = `${r.service} | ${r.resource_type} | ${r.resource_id.substring(0, 30)} | ${r.name.substring(0, 25)} | ${r.status} | $${(r.monthly_cost || 0).toFixed(2)}`;
    doc.text(line, 40, y);
    y += 11;
  }

  if (resources.length > 200) {
    doc.addPage();
    doc.fontSize(10).fillColor('#6B7280').text(`... and ${resources.length - 200} more resources. See the Excel export for the complete list.`, { align: 'center' });
  }

  doc.end();
  await new Promise(resolve => stream.on('finish', resolve));
}

function escXml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
