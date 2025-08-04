import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { adminAuth } from '../../middleware/adminAuth.js'; // Add this import
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { format as csvFormat } from '@fast-csv/format';
// Fix the Chart.js import path for v4+
import Chart from 'chart.js/auto';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { diagnoseAndFixMarketTrends } from '../../utils/fixMarketTrends.js';

const router = express.Router();

// Add this diagnostic endpoint to help identify the correct column names
router.get('/debug-schema', authenticateToken, async (req, res) => {
  try {
    // Query to get column names from the table
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'market_trends_mv'
      ORDER BY ordinal_position;
    `;
    const result = await pool.query(schemaQuery);
    
    // Log the column information for debugging
    console.log('Market trends table columns:', result.rows);
    
    res.json({
      success: true,
      columns: result.rows,
      message: 'Check server logs for the column details'
    });
  } catch (error) {
    console.error('Schema inspection error:', error);
    res.status(500).json({ 
      error: 'Failed to inspect schema',
      message: error.message
    });
  }
});

// Add this diagnostic endpoint to help identify and fix materialized view issues
router.get('/fix-structure', authenticateToken, adminAuth, async (req, res) => {
  try {
    // Attempt to diagnose and fix the market trends structure
    const result = await diagnoseAndFixMarketTrends();
    
    res.json({
      success: true,
      message: 'Market trends structure check complete',
      details: result
    });
  } catch (error) {
    console.error('Error fixing market trends structure:', error);
    res.status(500).json({ 
      error: 'Failed to fix market trends structure',
      message: error.message
    });
  }
});

// Add this emergency repair endpoint to fix the view when needed
router.get('/repair-view', authenticateToken, adminAuth, async (req, res) => {
  try {
    console.log('Starting emergency view repair...');
    
    // Drop the existing view if it exists
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS market_trends_mv');
    
    // Create materialized view directly from businesses table
    // Don't use temporary tables - they don't work with materialized views
    await pool.query(`
      CREATE MATERIALIZED VIEW market_trends_mv AS
      SELECT 
        date_listed,
        industry,
        location,
        AVG(price::numeric) as avg_price,
        AVG(CASE WHEN gross_revenue <> 0 THEN ebitda::numeric / gross_revenue::numeric ELSE NULL END) as avg_multiple,
        AVG(gross_revenue::numeric) as avg_gross_revenue,
        AVG(ebitda::numeric) as avg_ebitda,
        COUNT(*)::integer as listings_count
      FROM businesses
      WHERE price IS NOT NULL
      GROUP BY date_listed, industry, location
      ORDER BY date_listed DESC;
    `);
    
    // Add indices
    await pool.query(`
      CREATE INDEX market_trends_mv_date_idx ON market_trends_mv(date_listed);
      CREATE INDEX market_trends_mv_industry_idx ON market_trends_mv(industry);
      CREATE INDEX market_trends_mv_location_idx ON market_trends_mv(location);
    `);
    
    // Verify the view has data
    const countResult = await pool.query('SELECT COUNT(*) FROM market_trends_mv');
    const rowCount = parseInt(countResult.rows[0].count);
    
    // Check columns directly with pg_catalog
    const columnsQuery = await pool.query(`
      SELECT attname, format_type(atttypid, atttypmod) AS data_type
      FROM pg_catalog.pg_attribute
      WHERE attrelid = 'market_trends_mv'::regclass
      AND attnum > 0 
      AND NOT attisdropped
      ORDER BY attnum;
    `);
    
    res.json({
      success: true,
      message: 'Market trends view repaired successfully',
      rowCount: rowCount,
      columns: columnsQuery.rows
    });
  } catch (error) {
    console.error('Error repairing view:', error);
    res.status(500).json({ 
      error: 'Failed to repair market trends view',
      message: error.message 
    });
  }
});

// Get market trends data - update with more reliable column detection
router.get('/data', authenticateToken, async (req, res) => {
  try {
    // Extract filter parameters
    const { timeRange = '30', industry, location } = req.query;

    console.log('Market trends request:', { timeRange, industry, location });

    // First, let's determine what columns actually exist in our table
    // Use pg_catalog directly instead of information_schema for materialized views
    try {
      const columnsQuery = `
        SELECT attname as column_name
        FROM pg_catalog.pg_attribute
        WHERE attrelid = 'market_trends_mv'::regclass
          AND attnum > 0 
          AND NOT attisdropped;
      `;
      console.log('Executing column query:', columnsQuery);
      const columnsResult = await pool.query(columnsQuery);
      const availableColumns = columnsResult.rows.map(row => row.column_name);
      console.log('Available columns:', availableColumns);
      
      // Determine the date column - try common column names
      let dateColumn = null;
      const possibleDateColumns = ['date_listed', 'date', 'created_at', 'listing_date', 'created_date'];
      for (const column of possibleDateColumns) {
        if (availableColumns.includes(column)) {
          dateColumn = column;
          break;
        }
      }
      
      if (!dateColumn) {
        console.error('Could not identify a date column in market_trends_mv');
        return res.status(500).json({
          error: 'Schema configuration error',
          message: 'Could not identify a date column in the market trends table'
        });
      }

      // Build query conditions based on filters and available columns
      let conditions = [];
      let params = [];
      let paramCounter = 1;

      // Apply time range filter with the identified date column
      if (timeRange) {
        const days = parseInt(timeRange);
        if (!isNaN(days) && days > 0) {
          conditions.push(`${dateColumn} >= NOW() - INTERVAL '${days} days'`);
        } else {
          console.warn('Invalid timeRange parameter:', timeRange);
          conditions.push(`${dateColumn} >= NOW() - INTERVAL '30 days'`);
        }
      }

      // Apply industry filter if that column exists
      if (industry && availableColumns.includes('industry')) {
        conditions.push(`industry = $${paramCounter}`);
        params.push(industry);
        paramCounter++;
      } else if (industry && availableColumns.includes('business_type')) {
        // Try alternative column names
        conditions.push(`business_type = $${paramCounter}`);
        params.push(industry);
        paramCounter++;
      } else if (industry && availableColumns.includes('category')) {
        conditions.push(`category = $${paramCounter}`);
        params.push(industry);
        paramCounter++;
      }

      // Apply location filter if that column exists
      if (location && availableColumns.includes('location')) {
        conditions.push(`location = $${paramCounter}`);
        params.push(location);
        paramCounter++;
      } else if (location && availableColumns.includes('region')) {
        // Try alternative column names
        conditions.push(`region = $${paramCounter}`);
        params.push(location);
        paramCounter++;
      } else if (location && availableColumns.includes('area')) {
        conditions.push(`area = $${paramCounter}`);
        params.push(location);
        paramCounter++;
      }

      // Build the final query
      let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const query = `
        SELECT * FROM market_trends_mv
        ${whereClause}
        ORDER BY ${dateColumn} ASC
      `;

      console.log('Executing query:', { query, params });

      // Execute the query
      const result = await pool.query(query, params);
      console.log(`Query returned ${result.rows.length} rows`);
      
      // Map the results to a consistent format for the frontend
      const mappedData = result.rows.map(row => {
        const mappedRow = { ...row };
        
        // Ensure the date property exists with the correct column value
        if (dateColumn !== 'date') {
          mappedRow.date = row[dateColumn];
        }
        
        return mappedRow;
      });
      
      res.json(mappedData);
    } catch (dbError) {
      // Handle database-specific errors with more detail
      console.error('Database error during column detection:', dbError);
      console.error('Error details:', {
        code: dbError.code,
        detail: dbError.detail,
        hint: dbError.hint
      });
      res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to fetch market trends data from the database',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({ 
      error: 'Failed to process market trends request',
      message: error.message
    });
  }
});

// Get available filters - update with more reliable column detection
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    // Use pg_catalog directly instead of information_schema for materialized views
    const columnsQuery = `
      SELECT attname as column_name
      FROM pg_catalog.pg_attribute
      WHERE attrelid = 'market_trends_mv'::regclass
        AND attnum > 0 
        AND NOT attisdropped;
    `;
    console.log('Executing filter column query:', columnsQuery);
    const columnsResult = await pool.query(columnsQuery);
    const availableColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Available columns for filters:', availableColumns);
    
    // Try different column names for industry
    let industries = [];
    if (availableColumns.includes('industry')) {
      const industriesQuery = `
        SELECT DISTINCT industry FROM market_trends_mv
        WHERE industry IS NOT NULL
        ORDER BY industry
      `;
      const industriesResult = await pool.query(industriesQuery);
      industries = industriesResult.rows.map(row => row.industry);
    } else if (availableColumns.includes('business_type')) {
      const industriesQuery = `
        SELECT DISTINCT business_type FROM market_trends_mv
        WHERE business_type IS NOT NULL
        ORDER BY business_type
      `;
      const industriesResult = await pool.query(industriesQuery);
      industries = industriesResult.rows.map(row => row.business_type);
    } else if (availableColumns.includes('category')) {
      const industriesQuery = `
        SELECT DISTINCT category FROM market_trends_mv
        WHERE category IS NOT NULL
        ORDER BY category
      `;
      const industriesResult = await pool.query(industriesQuery);
      industries = industriesResult.rows.map(row => row.category);
    }
    
    // Try different column names for location
    let locations = [];
    if (availableColumns.includes('location')) {
      const locationsQuery = `
        SELECT DISTINCT location FROM market_trends_mv
        WHERE location IS NOT NULL
        ORDER BY location
      `;
      const locationsResult = await pool.query(locationsQuery);
      locations = locationsResult.rows.map(row => row.location);
    } else if (availableColumns.includes('region')) {
      const locationsQuery = `
        SELECT DISTINCT region FROM market_trends_mv
        WHERE region IS NOT NULL
        ORDER BY region
      `;
      const locationsResult = await pool.query(locationsQuery);
      locations = locationsResult.rows.map(row => row.region);
    } else if (availableColumns.includes('area')) {
      const locationsQuery = `
        SELECT DISTINCT area FROM market_trends_mv
        WHERE area IS NOT NULL
        ORDER BY area
      `;
      const locationsResult = await pool.query(locationsQuery);
      locations = locationsResult.rows.map(row => row.area);
    }

    res.json({
      industries,
      locations,
      availableColumns // Include this for debugging
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    // Add more detailed error reporting
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    res.status(500).json({ 
      error: 'Failed to fetch filters', 
      details: error.message 
    });
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

// Helper function to fetch data - update with more reliable column detection
async function fetchTrendsData(filters = {}) {
  const { timeRange = '30', industry, location } = filters;
  
  // Get available columns using pg_catalog
  const columnsQuery = `
    SELECT attname as column_name
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'market_trends_mv'::regclass
      AND attnum > 0 
      AND NOT attisdropped;
  `;
  const columnsResult = await pool.query(columnsQuery);
  const availableColumns = columnsResult.rows.map(row => row.column_name);
  
  // Find date column
  let dateColumn = 'date';
  const possibleDateColumns = ['date_listed', 'date', 'created_at', 'listing_date', 'created_date'];
  for (const column of possibleDateColumns) {
    if (availableColumns.includes(column)) {
      dateColumn = column;
      break;
    }
  }
  
  // Build query conditions
  let conditions = [];
  let params = [];
  let paramCounter = 1;

  // Apply time range filter
  if (timeRange) {
    const days = parseInt(timeRange);
    if (!isNaN(days)) {
      conditions.push(`${dateColumn} >= NOW() - INTERVAL '${days} days'`);
    }
  }

  // Apply industry filter - try different possible column names
  if (industry) {
    if (availableColumns.includes('industry')) {
      conditions.push(`industry = $${paramCounter}`);
      params.push(industry);
      paramCounter++;
    } else if (availableColumns.includes('business_type')) {
      conditions.push(`business_type = $${paramCounter}`);
      params.push(industry);
      paramCounter++;
    } else if (availableColumns.includes('category')) {
      conditions.push(`category = $${paramCounter}`);
      params.push(industry);
      paramCounter++;
    }
  }

  // Apply location filter - try different possible column names
  if (location) {
    if (availableColumns.includes('location')) {
      conditions.push(`location = $${paramCounter}`);
      params.push(location);
      paramCounter++;
    } else if (availableColumns.includes('region')) {
      conditions.push(`region = $${paramCounter}`);
      params.push(location);
      paramCounter++;
    } else if (availableColumns.includes('area')) {
      conditions.push(`area = $${paramCounter}`);
      params.push(location);
      paramCounter++;
    }
  }

  // Build the final query
  let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const query = `
    SELECT * FROM market_trends_mv
    ${whereClause}
    ORDER BY ${dateColumn} ASC
  `;

  console.log('Fetching trends with query:', query, params);
  
  const result = await pool.query(query, params);
  
  // Map the results to a consistent format
  return result.rows.map(row => {
    const mappedRow = { ...row };
    
    // Ensure the date property exists
    if (dateColumn !== 'date') {
      mappedRow.date = row[dateColumn];
    }
    
    return mappedRow;
  });
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
        labels: data.map(d => new Date(d.date_listed).toLocaleDateString()),
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
      new Date(item.date_listed).toLocaleDateString(),
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
  // Prepare data for CSV - update field names if needed
  const fields = ['date_listed', 'industry', 'location', 'avg_price', 'avg_multiple', 'listings_count'];
  
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.csv`);
    
    const stream = csvFormat({ headers: fields });
    stream.pipe(res);
    
    // Write data rows
    data.forEach(row => {
      stream.write(row);
    });
    
    stream.end();
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
      date: new Date(item.date_listed),
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
