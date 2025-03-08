-- Function to calculate and store growth metrics
CREATE OR REPLACE FUNCTION update_business_growth_metrics()
RETURNS void AS $$
BEGIN
    -- Clear existing metrics for today
    DELETE FROM business_growth_metrics 
    WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '1 day';
    
    -- Insert new metrics
    INSERT INTO business_growth_metrics (
        business_id, 
        date, 
        industry, 
        previous_revenue, 
        current_revenue, 
        growth_rate
    )
    SELECT 
        b.id,
        NOW(),
        b.industry,
        -- Get revenue from 1 year ago if available
        LAG(b.gross_revenue::numeric) OVER (PARTITION BY b.industry ORDER BY b.date_listed),
        b.gross_revenue::numeric,
        -- Calculate growth rate
        CASE 
            WHEN LAG(b.gross_revenue::numeric) OVER (PARTITION BY b.industry ORDER BY b.date_listed) > 0 
            THEN (b.gross_revenue::numeric - LAG(b.gross_revenue::numeric) OVER (PARTITION BY b.industry ORDER BY b.date_listed)) / 
                 LAG(b.gross_revenue::numeric) OVER (PARTITION BY b.industry ORDER BY b.date_listed) * 100
            ELSE NULL
        END
    FROM 
        businesses b
    WHERE 
        b.gross_revenue IS NOT NULL AND
        b.gross_revenue <> '0' AND
        b.gross_revenue::numeric > 0;
END;
$$ LANGUAGE plpgsql;
