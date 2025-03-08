import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser as CsvParser } from 'json2csv';
// Fix the Chart.js import path - it needs the full file path
import Chart from 'chart.js/auto/auto.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const router = express.Router();

// Get market trends data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    // Extract filter parameters
    const { timeRange = '30', industry, location } = req.query;

    // Build query conditions based on filters
    let conditions = [];
    let params = [];
    let paramCounter = 1;

    // Apply time range filter
    if (timeRange) {
      const days = parseInt(timeRange);
      if (!isNaN(days)) {
        conditions.push(`date >= NOW() - INTERVAL '${days} days'`);
      }
    }

    // Apply industry filter
    if (industry) {
      conditions.push(`industry = $${paramCounter}`);
      params.push(industry);
      paramCounter++;
    }

    // Apply location filter
    if (location) {
      conditions.push(`location = $${paramCounter}`);
      params.push(location);
      paramCounter++;
    }

    // Build the final query
    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM market_trends_mv
      ${whereClause}
      ORDER BY date ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({ error: 'Failed to fetch market trends data' });
  }
});

// Get available filters
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    const industriesQuery = `
      SELECT DISTINCT industry FROM market_trends_mv
      WHERE industry IS NOT NULL
      ORDER BY industry
    `;
    
    const locationsQuery = `
      SELECT DISTINCT location FROM market_trends_mv
      WHERE location IS NOT NULL
      ORDER BY location
    `;

    const industries = await pool.query(industriesQuery);
    const locations = await pool.query(locationsQuery);

    res.json({
      industries: industries.rows.map(row => row.industry),
      locations: locations.rows.map(row => row.location)
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Export market trends data
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { format, filters, trendsData, exportOptions } = req.body;
    
    if (!format) {
      return res.status(400).json({ message: 'Export format is required' });
    }
    
    // If trendsData is not provided, fetch it using the filters
    const data = trendsData || await fetchTrendsData(filters);
    
    // Make sure we handle errors before sending headers
    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          await exportPDF(res, data, filters, exportOptions);
          break;
        case 'csv':
          exportCSV(res, data);
          break;
        case 'excel':
          await exportExcel(res, data);
          break;
        default:
          return res.status(400).json({ message: 'Unsupported export format' });
      }
    } catch (exportError) {
      console.error('Export processing error:', exportError);
      // Only send error if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to process export: ' + exportError.message });
      }
    }
  } catch (error) {
    console.error('Export error:', error);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate export: ' + error.message });
    }
  }
});

// For GET requests - backward compatibility
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format, timeRange, industry, location } = req.query;
    
    if (!format) {
      return res.status(400).json({ message: 'Export format is required' });
    }
    
    // Fetch data based on query parameters
    const filters = { timeRange, industry, location };
    const data = await fetchTrendsData(filters);
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportCSV(res, data);
        break;
      case 'excel':
        await exportExcel(res, data);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported export format for GET request' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to generate export' });
  }
});

// Helper function to fetch data
async function fetchTrendsData(filters = {}) {
  const { timeRange = '30', industry, location } = filters;
  
  // Build query conditions based on filters
  let conditions = [];
  let params = [];
  let paramCounter = 1;

  // Apply time range filter
  if (timeRange) {
    const days = parseInt(timeRange);
    if (!isNaN(days)) {
      conditions.push(`date >= NOW() - INTERVAL '${days} days'`);
    }
  }

  // Apply industry filter
  if (industry) {
    conditions.push(`industry = $${paramCounter}`);
    params.push(industry);
    paramCounter++;
  }

  // Apply location filter
  if (location) {
    conditions.push(`location = $${paramCounter}`);
    params.push(location);
    paramCounter++;
  }

  // Build the final query
  let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const query = `
    SELECT * FROM market_trends_mv
    ${whereClause}
    ORDER BY date ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

// PDF Export function with custom styling and visualizations
async function exportPDF(res, data, filters, options = {}) {
  // Set content type for PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.pdf`);

  // Create PDF document
  const doc = new PDFDocument({
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    size: 'A4'
  });

  // Pipe PDF to response
  doc.pipe(res);

  // Document title
  doc.font('Helvetica-Bold').fontSize(24).text('Market Trends Report', { align: 'center' });
  doc.moveDown();
  
  // Add timestamp
  doc.font('Helvetica').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Add filter information
  doc.font('Helvetica-Bold').fontSize(14).text('Filter Settings:');
  doc.font('Helvetica').fontSize(12);
  doc.text(`Time Range: Last ${filters.timeRange || 30} days`);
  doc.text(`Industry: ${filters.industry || 'All Industries'}`);
  doc.text(`Location: ${filters.location || 'All Locations'}`);
  doc.moveDown(2);

  // Add summary section if requested
  if (options.includeSummary) {
    // Calculate summary metrics
    const avgPrice = data.reduce((sum, item) => sum + parseFloat(item.avg_price || 0), 0) / Math.max(data.length, 1);
    const avgMultiple = data.reduce((sum, item) => {
      const multiple = parseFloat(item.avg_multiple || 0);
      return sum + (isNaN(multiple) ? 0 : multiple);
    }, 0) / Math.max(data.length, 1);

    // Growth calculation
    let growthPercentage = 0;
    if (data.length >= 2) {
      const oldestData = data[0];
      const newestData = data[data.length - 1];
      growthPercentage = ((newestData.avg_price - oldestData.avg_price) / oldestData.avg_price) * 100;
    }

    doc.font('Helvetica-Bold').fontSize(16).text('Executive Summary', { align: 'center' });
    doc.moveDown();
    
    doc.font('Helvetica').fontSize(12);
    doc.text(`This report provides an analysis of business valuation trends ${filters.industry ? `in the ${filters.industry} industry` : 'across all industries'} ${filters.location ? `in ${filters.location}` : ''} over the past ${filters.timeRange || 30} days.`);
    doc.moveDown();
    
    doc.text(`Average Business Valuation: £${Math.round(avgPrice).toLocaleString()}`);
    doc.text(`Average Multiple: ${avgMultiple.toFixed(2)}x`);
    doc.text(`Valuation Growth: ${growthPercentage.toFixed(1)}%`);
    doc.moveDown();
    
    // Industry insights if available
    if (data.length > 0 && filters.industry) {
      doc.text(`The ${filters.industry} industry shows ${growthPercentage >= 0 ? 'positive' : 'negative'} growth trends with valuation ${growthPercentage >= 0 ? 'increasing' : 'decreasing'} at a rate of ${Math.abs(growthPercentage).toFixed(1)}% over the analyzed period.`);
    }
    
    doc.moveDown(2);
  }

  // Add charts if requested and data is available
  if (options.includeCharts && data.length > 0) {
    doc.font('Helvetica-Bold').fontSize(16).text('Market Trends Visualization', { align: 'center' });
    doc.moveDown();
    
    // Setup chartJS node canvas
    const chartCallback = (ChartJS) => {
      // ChartJS configuration if needed
    };
    
    const width = 500;
    const height = 300;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
    
    try {
      // Create trend chart configuration
      const chartData = {
        labels: data.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [{
          label: 'Average Price',
          data: data.map(d => d.avg_price),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      };
      
      const chartConfig = {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Business Valuation Trend',
              font: { size: 16 }
            },
            legend: { display: true }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { 
                display: true,
                text: 'Average Price (£)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          }
        }
      };
      
      // Generate chart image
      const image = await chartJSNodeCanvas.renderToBuffer(chartConfig);
      
      // Add chart to the PDF
      doc.image(image, {
        fit: [500, 300],
        align: 'center'
      });
      
      doc.moveDown();
      doc.font('Helvetica').fontSize(10).text('Figure 1: Business Valuation Trend', { align: 'center' });
      doc.moveDown(2);
    } catch (err) {
      console.error('Chart generation error:', err);
      doc.text('Error generating chart visualization.');
    }
  }

  // Add data table if requested
  if (options.includeTable && data.length > 0) {
    doc.font('Helvetica-Bold').fontSize(16).text('Detailed Market Data', { align: 'center' });
    doc.moveDown();
    
    // Table headers
    const tableTop = doc.y;
    const tableHeaders = ['Date', 'Industry', 'Location', 'Avg. Price (£)', 'Avg. Multiple'];
    const tableData = data.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.industry || '-',
      item.location || '-',
      '£' + Math.round(parseFloat(item.avg_price || 0)).toLocaleString(),
      // Fix: Ensure avg_multiple is a number before calling toFixed
      parseFloat(item.avg_multiple || 0).toFixed(2) + 'x'
    ]);
    
    // Check if we need a new page
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Draw table headers
    const columnWidth = 100;
    doc.font('Helvetica-Bold').fontSize(10);
    tableHeaders.forEach((header, i) => {
      doc.text(header, 50 + (i * columnWidth), doc.y, { width: columnWidth, align: 'left' });
    });
    
    doc.moveDown();
    
    // Draw table rows (limit to prevent very large PDFs)
    doc.font('Helvetica').fontSize(10);
    const maxRows = Math.min(tableData.length, 50);
    for (let i = 0; i < maxRows; i++) {
      // Check if we need a new page
      if (doc.y > doc.page.height - 50) {
        doc.addPage();
      }
      
      const row = tableData[i];
      row.forEach((cell, j) => {
        doc.text(cell, 50 + (j * columnWidth), doc.y, { width: columnWidth, align: 'left' });
      });
      doc.moveDown();
    }
    
    // Add note if data was truncated
    if (tableData.length > maxRows) {
      doc.font('Helvetica-Oblique').fontSize(9);
      doc.text(`* Showing ${maxRows} of ${tableData.length} total records.`, { align: 'center' });
    }
  }

  // Add footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    // Footer text
    doc.font('Helvetica').fontSize(8);
    doc.text(
      `Page ${i + 1} of ${pageCount} - Generated by Business Marketplace`,
      50,
      doc.page.height - 40,
      { align: 'center', width: doc.page.width - 100 }
    );
  }

  // Finalize PDF
  doc.end();
}

function exportCSV(res, data) {
  // Prepare data for CSV
  const fields = ['date', 'industry', 'location', 'avg_price', 'avg_multiple', 'listings_count'];
  const opts = { fields };
  
  try {
    const parser = new CsvParser(opts);
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

// Fix Excel export to ensure proper number conversion
async function exportExcel(res, data) {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Market Trends');
  
  // Define columns
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Industry', key: 'industry', width: 20 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Avg. Price', key: 'avg_price', width: 15, style: { numFmt: '"£"#,##0' } },
    { header: 'Avg. Multiple', key: 'avg_multiple', width: 15, style: { numFmt: '0.00"x"' } },
    { header: 'Listings Count', key: 'listings_count', width: 15 }
  ];
  
  // Add data rows - ensure all numeric values are properly parsed
  data.forEach(item => {
    worksheet.addRow({
      date: new Date(item.date),
      industry: item.industry || '',
      location: item.location || '',
      avg_price: parseFloat(item.avg_price || 0),
      avg_multiple: parseFloat(item.avg_multiple || 0),
      listings_count: parseInt(item.listings_count || 0)
    });
  });
  
  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // Write to buffer and send response
  const buffer = await workbook.xlsx.writeBuffer();
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.xlsx`);
  res.status(200).send(buffer);
}

export default router;
