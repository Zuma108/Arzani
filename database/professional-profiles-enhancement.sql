-- Professional Profiles Enhancement Migration
-- This migration adds comprehensive professional profile functionality to the verification system

-- Create professional_profiles table for detailed professional information
CREATE TABLE IF NOT EXISTS professional_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Professional Information
    professional_bio TEXT,
    professional_tagline VARCHAR(200), -- Short professional summary
    years_experience INTEGER,
    professional_website VARCHAR(500),
    
    -- Services and Industries
    services_offered JSONB DEFAULT '[]'::jsonb, -- Array of services
    industries_serviced JSONB DEFAULT '[]'::jsonb, -- Array of industries
    specializations JSONB DEFAULT '[]'::jsonb, -- Array of specializations
    
    -- Media and Portfolio
    professional_picture_url VARCHAR(500),
    portfolio_items JSONB DEFAULT '[]'::jsonb, -- Array of portfolio items with urls, descriptions
    certifications JSONB DEFAULT '[]'::jsonb, -- Array of certifications
    
    -- Contact and Availability
    professional_contact JSONB DEFAULT '{}'::jsonb, -- Professional email, phone, etc.
    availability_schedule JSONB DEFAULT '{}'::jsonb, -- Working hours, time zones
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    
    -- Pricing and Business Information
    pricing_info JSONB DEFAULT '{}'::jsonb, -- Pricing structure, rates
    service_locations JSONB DEFAULT '[]'::jsonb, -- Where they provide services
    languages_spoken JSONB DEFAULT '[]'::jsonb, -- Languages they speak
    
    -- Social and Professional Links
    social_links JSONB DEFAULT '{}'::jsonb, -- LinkedIn, Twitter, etc.
    professional_references JSONB DEFAULT '[]'::jsonb, -- Professional references
    
    -- Profile Settings
    profile_visibility VARCHAR(20) DEFAULT 'public', -- public, private, verified_only
    allow_direct_contact BOOLEAN DEFAULT true,
    featured_professional BOOLEAN DEFAULT false,
    profile_completion_score INTEGER DEFAULT 0, -- 0-100 based on filled fields
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one profile per user
    CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_visibility ON professional_profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_featured ON professional_profiles(featured_professional);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_completion ON professional_profiles(profile_completion_score);

-- GIN indexes for JSONB searches
CREATE INDEX IF NOT EXISTS idx_professional_profiles_services ON professional_profiles USING GIN(services_offered);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_industries ON professional_profiles USING GIN(industries_serviced);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_specializations ON professional_profiles USING GIN(specializations);

-- Create professional_reviews table for peer reviews
CREATE TABLE IF NOT EXISTS professional_reviews (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    project_context VARCHAR(200), -- Brief description of work context
    is_verified_client BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent multiple reviews from same reviewer to same professional
    CONSTRAINT unique_reviewer_professional UNIQUE(professional_id, reviewer_id)
);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_professional_reviews_professional ON professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_rating ON professional_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_verified ON professional_reviews(is_verified_client);

-- Create professional_portfolio table for detailed portfolio items
CREATE TABLE IF NOT EXISTS professional_portfolio (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_url VARCHAR(500),
    image_urls JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
    technologies_used JSONB DEFAULT '[]'::jsonb, -- Array of technologies/tools
    project_category VARCHAR(100),
    completion_date DATE,
    client_testimonial TEXT,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for portfolio
CREATE INDEX IF NOT EXISTS idx_professional_portfolio_professional ON professional_portfolio(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_portfolio_featured ON professional_portfolio(is_featured);
CREATE INDEX IF NOT EXISTS idx_professional_portfolio_category ON professional_portfolio(project_category);

-- Add trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_professional_profiles_updated_at 
    BEFORE UPDATE ON professional_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_reviews_updated_at 
    BEFORE UPDATE ON professional_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_portfolio_updated_at 
    BEFORE UPDATE ON professional_portfolio 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for professional profile summary
CREATE OR REPLACE VIEW v_professional_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.is_verified_professional,
    u.professional_type,
    u.professional_verification_date,
    pp.professional_bio,
    pp.professional_tagline,
    pp.years_experience,
    pp.professional_website,
    pp.services_offered,
    pp.industries_serviced,
    pp.professional_picture_url,
    pp.profile_visibility,
    pp.featured_professional,
    pp.profile_completion_score,
    COALESCE(ROUND(AVG(pr.rating), 2), 0) as average_rating,
    COUNT(pr.id) as review_count,
    pp.created_at as profile_created_at,
    pp.updated_at as profile_updated_at
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
LEFT JOIN professional_reviews pr ON u.id = pr.professional_id
WHERE u.is_verified_professional = true
GROUP BY u.id, u.username, u.email, u.is_verified_professional, u.professional_type, 
         u.professional_verification_date, pp.professional_bio, pp.professional_tagline,
         pp.years_experience, pp.professional_website, pp.services_offered, 
         pp.industries_serviced, pp.professional_picture_url, pp.profile_visibility,
         pp.featured_professional, pp.profile_completion_score, pp.created_at, pp.updated_at;

-- Create function to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score(profile_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    profile_record professional_profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_record FROM professional_profiles WHERE id = profile_id;
    
    IF profile_record.id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Basic info (40 points total)
    IF profile_record.professional_bio IS NOT NULL AND LENGTH(profile_record.professional_bio) > 50 THEN
        score := score + 15;
    END IF;
    
    IF profile_record.professional_tagline IS NOT NULL AND LENGTH(profile_record.professional_tagline) > 10 THEN
        score := score + 10;
    END IF;
    
    IF profile_record.years_experience IS NOT NULL AND profile_record.years_experience > 0 THEN
        score := score + 10;
    END IF;
    
    IF profile_record.professional_picture_url IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Services and Industries (25 points total)
    IF jsonb_array_length(profile_record.services_offered) > 0 THEN
        score := score + 15;
    END IF;
    
    IF jsonb_array_length(profile_record.industries_serviced) > 0 THEN
        score := score + 10;
    END IF;
    
    -- Contact and Business Info (20 points total)
    IF profile_record.professional_website IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    IF jsonb_extract_path_text(profile_record.professional_contact, 'email') IS NOT NULL THEN
        score := score + 5;
    END IF;
    
    IF jsonb_extract_path_text(profile_record.professional_contact, 'phone') IS NOT NULL THEN
        score := score + 5;
    END IF;
    
    -- Portfolio and additional info (15 points total)
    IF jsonb_array_length(profile_record.portfolio_items) > 0 THEN
        score := score + 10;
    END IF;
    
    IF jsonb_array_length(profile_record.certifications) > 0 THEN
        score := score + 5;
    END IF;
    
    RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update completion score
CREATE OR REPLACE FUNCTION update_profile_completion_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_completion_score := calculate_profile_completion_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completion_score
    BEFORE INSERT OR UPDATE ON professional_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_completion_score();

-- Add some sample data for predefined services and industries
CREATE TABLE IF NOT EXISTS predefined_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    service_category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predefined_industries (
    id SERIAL PRIMARY KEY,
    industry_name VARCHAR(100) NOT NULL UNIQUE,
    industry_category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common services
INSERT INTO predefined_services (service_name, service_category) VALUES
('Legal Consultation', 'Legal'),
('Contract Review', 'Legal'),
('Business Formation', 'Legal'),
('Intellectual Property', 'Legal'),
('Employment Law', 'Legal'),
('Financial Planning', 'Finance'),
('Tax Preparation', 'Finance'),
('Investment Advisory', 'Finance'),
('Accounting Services', 'Finance'),
('Business Valuation', 'Finance'),
('Management Consulting', 'Consulting'),
('Strategy Development', 'Consulting'),
('Operations Consulting', 'Consulting'),
('HR Consulting', 'Consulting'),
('IT Consulting', 'Technology'),
('Software Development', 'Technology'),
('Web Development', 'Technology'),
('Digital Marketing', 'Marketing'),
('Brand Strategy', 'Marketing'),
('Content Creation', 'Marketing'),
('Graphic Design', 'Design'),
('UX/UI Design', 'Design'),
('Architecture', 'Design'),
('Interior Design', 'Design')
ON CONFLICT (service_name) DO NOTHING;

-- Insert common industries
INSERT INTO predefined_industries (industry_name, industry_category) VALUES
('Healthcare', 'Healthcare'),
('Pharmaceuticals', 'Healthcare'),
('Medical Devices', 'Healthcare'),
('Technology', 'Technology'),
('Software', 'Technology'),
('Financial Services', 'Finance'),
('Banking', 'Finance'),
('Insurance', 'Finance'),
('Real Estate', 'Real Estate'),
('Construction', 'Real Estate'),
('Manufacturing', 'Manufacturing'),
('Automotive', 'Manufacturing'),
('Retail', 'Retail'),
('E-commerce', 'Retail'),
('Education', 'Education'),
('Entertainment', 'Media'),
('Media', 'Media'),
('Non-profit', 'Non-profit'),
('Government', 'Government'),
('Energy', 'Energy'),
('Telecommunications', 'Technology'),
('Hospitality', 'Service'),
('Transportation', 'Transportation'),
('Agriculture', 'Agriculture')
ON CONFLICT (industry_name) DO NOTHING;

-- Add license_number field to professional_verification_requests if it doesn't exist
ALTER TABLE professional_verification_requests 
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

-- Comments for documentation
COMMENT ON TABLE professional_profiles IS 'Detailed professional profile information for verified professionals';
COMMENT ON TABLE professional_reviews IS 'Peer reviews and ratings for professionals';
COMMENT ON TABLE professional_portfolio IS 'Portfolio items showcasing professional work';
COMMENT ON FUNCTION calculate_profile_completion_score IS 'Calculates completion score based on filled profile fields';

-- Grant necessary permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON professional_profiles TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON professional_reviews TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON professional_portfolio TO your_app_user;
-- GRANT SELECT ON predefined_services TO your_app_user;
-- GRANT SELECT ON predefined_industries TO your_app_user;

-- Create search function for professionals
CREATE OR REPLACE FUNCTION search_professionals(
    search_query TEXT DEFAULT NULL,
    service_filter JSONB DEFAULT NULL,
    industry_filter JSONB DEFAULT NULL,
    min_rating DECIMAL DEFAULT NULL,
    min_experience INTEGER DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    professional_type VARCHAR,
    professional_tagline VARCHAR,
    professional_bio TEXT,
    years_experience INTEGER,
    services_offered JSONB,
    industries_serviced JSONB,
    professional_picture_url VARCHAR,
    average_rating DECIMAL,
    review_count BIGINT,
    profile_completion_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vps.user_id,
        vps.username,
        vps.professional_type,
        vps.professional_tagline,
        vps.professional_bio,
        vps.years_experience,
        vps.services_offered,
        vps.industries_serviced,
        vps.professional_picture_url,
        vps.average_rating,
        vps.review_count,
        vps.profile_completion_score
    FROM v_professional_summary vps
    WHERE 
        vps.profile_visibility = 'public'
        AND (search_query IS NULL OR 
             vps.professional_bio ILIKE '%' || search_query || '%' OR
             vps.professional_tagline ILIKE '%' || search_query || '%' OR
             vps.username ILIKE '%' || search_query || '%')
        AND (service_filter IS NULL OR vps.services_offered ?| ARRAY(SELECT jsonb_array_elements_text(service_filter)))
        AND (industry_filter IS NULL OR vps.industries_serviced ?| ARRAY(SELECT jsonb_array_elements_text(industry_filter)))
        AND (min_rating IS NULL OR vps.average_rating >= min_rating)
        AND (min_experience IS NULL OR vps.years_experience >= min_experience)
    ORDER BY 
        vps.featured_professional DESC,
        vps.average_rating DESC,
        vps.profile_completion_score DESC,
        vps.review_count DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
