/**
 * Enhanced Role-Based Routing Middleware with Client-Side Caching
 * This middleware provides intelligent role detection with client-side caching support
 */

import pool from '../db.js';

/**
 * Client-side cache configuration
 */
const CACHE_CONFIG = {
  localStorage: {
    roleKey: 'arzani_user_role',
    confidenceKey: 'arzani_role_confidence',
    expirationKey: 'arzani_role_expires',
    behavioralKey: 'arzani_behavioral_data'
  },
  sessionStorage: {
    routingMethodKey: 'arzani_routing_method',
    sessionDataKey: 'arzani_session_data',
    abTestVariantKey: 'arzani_ab_variant'
  },
  defaultExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  behavioralExpiration: 24 * 60 * 60 * 1000    // 24 hours for behavioral data
};

/**
 * Enhanced role detection with multi-source analysis
 */
export async function detectUserRole(req, res, next) {
  try {
    const userId = req.user?.userId;
    const sessionId = req.sessionID || req.session?.id;
    
    // Initialize role detection result
    let roleData = {
      detectedRole: null,
      confidence: 0.0,
      method: 'unknown',
      shouldCache: false,
      cacheExpiration: null,
      behavioralData: {},
      recommendations: []
    };

    // 1. Check database cache first (for registered users)
    if (userId) {
      roleData = await checkDatabaseCache(userId);
    }
    
    // 2. If no database cache, check session cache
    if (!roleData.detectedRole && sessionId) {
      const sessionCache = await checkSessionCache(sessionId);
      if (sessionCache) {
        roleData = { ...roleData, ...sessionCache };
      }
    }
    
    // 3. If still no role, perform behavioral analysis
    if (!roleData.detectedRole || roleData.confidence < 0.7) {
      const behavioralAnalysis = await performBehavioralAnalysis(userId, sessionId, req);
      roleData = mergeBehavioralData(roleData, behavioralAnalysis);
    }
    
    // 4. Apply business rules and confidence thresholds
    roleData = applyBusinessRules(roleData, req);
    
    // 5. Cache the results if confidence is high enough
    if (roleData.confidence >= 0.6 && roleData.shouldCache) {
      await cacheRoleData(userId, sessionId, roleData);
    }
    
    // 6. Track behavioral data for future analysis
    if (userId || sessionId) {
      await trackBehavioralData(userId, sessionId, req, roleData);
    }
    
    // Attach role data to request for use in routes
    req.userRole = roleData;
    req.roleDetection = {
      role: roleData.detectedRole,
      confidence: roleData.confidence,
      method: roleData.method,
      shouldShowSmartRouting: roleData.confidence >= 0.8,
      cacheInstructions: generateClientCacheInstructions(roleData)
    };
    
    next();
  } catch (error) {
    console.error('Role detection error:', error);
    // Continue without role detection on error
    req.userRole = { detectedRole: null, confidence: 0.0, method: 'error' };
    req.roleDetection = { role: null, confidence: 0.0, method: 'error' };
    next();
  }
}

/**
 * Check database cache for user role preferences
 */
async function checkDatabaseCache(userId) {
  try {
    const result = await pool.query(`
      SELECT 
        preferred_role,
        confidence_score,
        detection_method,
        behavioral_data,
        expires_at,
        created_at
      FROM user_role_preferences 
      WHERE user_id = $1 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY updated_at DESC 
      LIMIT 1
    `, [userId]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        detectedRole: row.preferred_role,
        confidence: parseFloat(row.confidence_score),
        method: row.detection_method,
        behavioralData: row.behavioral_data || {},
        cacheExpiration: row.expires_at,
        shouldCache: false // Already cached
      };
    }
    
    return { detectedRole: null, confidence: 0.0, method: 'no_cache' };
  } catch (error) {
    console.error('Database cache check error:', error);
    return { detectedRole: null, confidence: 0.0, method: 'db_error' };
  }
}

/**
 * Check session cache for temporary role data
 */
async function checkSessionCache(sessionId) {
  try {
    const result = await pool.query(`
      SELECT cache_value
      FROM user_session_cache 
      WHERE session_id = $1 
        AND cache_key = 'role_detection'
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, [sessionId]);

    if (result.rows.length > 0) {
      const cacheData = result.rows[0].cache_value;
      return {
        detectedRole: cacheData.role,
        confidence: cacheData.confidence,
        method: cacheData.method,
        behavioralData: cacheData.behavioral_data || {},
        shouldCache: false // Already in session cache
      };
    }
    
    return null;
  } catch (error) {
    console.error('Session cache check error:', error);
    return null;
  }
}

/**
 * Perform behavioral analysis based on user actions
 */
async function performBehavioralAnalysis(userId, sessionId, req) {
  const behavioralData = {
    pageViews: {},
    searchTerms: [],
    clickPatterns: {},
    timeSpent: {},
    formInteractions: {}
  };
  
  let confidence = 0.0;
  let detectedRole = null;
  
  try {
    // Analyze recent behavioral data from database
    const behavioralQuery = `
      SELECT 
        behavior_type,
        behavior_data,
        role_indicators,
        weight,
        timestamp
      FROM user_behavioral_tracking 
      WHERE (user_id = $1 OR session_id = $2)
        AND timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    
    const behavioralResult = await pool.query(behavioralQuery, [userId, sessionId]);
    
    // Score accumulation for each role
    const roleScores = {
      buyer: 0,
      seller: 0,
      professional: 0,
      investor: 0
    };
    
    behavioralResult.rows.forEach(row => {
      const indicators = row.role_indicators || {};
      const weight = parseFloat(row.weight) || 1.0;
      
      Object.keys(roleScores).forEach(role => {
        if (indicators[role]) {
          roleScores[role] += indicators[role] * weight;
        }
      });
      
      // Collect behavioral data for analysis
      if (row.behavior_type === 'page_view') {
        const page = row.behavior_data.page;
        behavioralData.pageViews[page] = (behavioralData.pageViews[page] || 0) + 1;
      }
    });
    
    // Determine the role with highest score
    const maxScore = Math.max(...Object.values(roleScores));
    if (maxScore > 0) {
      detectedRole = Object.keys(roleScores).find(role => roleScores[role] === maxScore);
      confidence = Math.min(maxScore / 10, 1.0); // Normalize to 0-1 scale
    }
    
    // Analyze current request for additional context
    const currentPageAnalysis = analyzeCurrentPage(req);
    if (currentPageAnalysis.roleIndicator) {
      roleScores[currentPageAnalysis.roleIndicator] += currentPageAnalysis.weight;
      confidence = Math.min(confidence + currentPageAnalysis.confidence, 1.0);
    }
    
    return {
      detectedRole,
      confidence,
      method: 'behavioral_analysis',
      behavioralData,
      roleScores,
      shouldCache: confidence >= 0.6
    };
    
  } catch (error) {
    console.error('Behavioral analysis error:', error);
    return {
      detectedRole: null,
      confidence: 0.0,
      method: 'behavioral_error',
      behavioralData,
      shouldCache: false
    };
  }
}

/**
 * Analyze current page/request for role indicators
 */
function analyzeCurrentPage(req) {
  const path = req.path.toLowerCase();
  const userAgent = req.headers['user-agent'] || '';
  
  // Page-based role indicators
  const pageIndicators = {
    '/buyer-landing': { role: 'buyer', weight: 2.0, confidence: 0.3 },
    '/seller-landing': { role: 'seller', weight: 2.0, confidence: 0.3 },
    '/marketplace-landing': { role: 'buyer', weight: 1.5, confidence: 0.2 },
    '/business-valuation': { role: 'seller', weight: 1.8, confidence: 0.25 },
    '/professional': { role: 'professional', weight: 2.0, confidence: 0.4 },
    '/buyer-dashboard': { role: 'buyer', weight: 2.5, confidence: 0.5 },
    '/seller-questionnaire': { role: 'seller', weight: 2.5, confidence: 0.5 },
    '/submit-business': { role: 'seller', weight: 2.0, confidence: 0.4 },
    '/saved-businesses': { role: 'buyer', weight: 1.5, confidence: 0.3 }
  };
  
  for (const [pagePath, indicator] of Object.entries(pageIndicators)) {
    if (path.includes(pagePath)) {
      return {
        roleIndicator: indicator.role,
        weight: indicator.weight,
        confidence: indicator.confidence
      };
    }
  }
  
  return { roleIndicator: null, weight: 0, confidence: 0 };
}

/**
 * Merge behavioral analysis with existing role data
 */
function mergeBehavioralData(existingData, behavioralAnalysis) {
  if (!behavioralAnalysis.detectedRole) {
    return existingData;
  }
  
  // If behavioral analysis has higher confidence, use it
  if (behavioralAnalysis.confidence > existingData.confidence) {
    return {
      ...existingData,
      ...behavioralAnalysis,
      method: `${existingData.method}_+_behavioral`
    };
  }
  
  // Otherwise, merge the data
  return {
    ...existingData,
    behavioralData: {
      ...existingData.behavioralData,
      ...behavioralAnalysis.behavioralData
    },
    confidence: Math.max(existingData.confidence, behavioralAnalysis.confidence * 0.7),
    method: `${existingData.method}_+_behavioral`
  };
}

/**
 * Apply business rules and confidence thresholds
 */
function applyBusinessRules(roleData, req) {
  // Business rule: If user is on a specific landing page, boost confidence
  const path = req.path.toLowerCase();
  
  if (path === '/buyer-landing' && roleData.detectedRole === 'buyer') {
    roleData.confidence = Math.min(roleData.confidence + 0.2, 1.0);
  } else if (path === '/seller-landing' && roleData.detectedRole === 'seller') {
    roleData.confidence = Math.min(roleData.confidence + 0.2, 1.0);
  }
  
  // Business rule: Set minimum confidence for caching
  roleData.shouldCache = roleData.confidence >= 0.6;
  
  // Business rule: Set cache expiration based on confidence
  if (roleData.confidence >= 0.8) {
    roleData.cacheExpiration = new Date(Date.now() + CACHE_CONFIG.defaultExpiration);
  } else if (roleData.confidence >= 0.6) {
    roleData.cacheExpiration = new Date(Date.now() + CACHE_CONFIG.behavioralExpiration);
  }
  
  return roleData;
}

/**
 * Cache role data in database
 */
async function cacheRoleData(userId, sessionId, roleData) {
  try {
    if (userId && roleData.detectedRole) {
      // Cache in user preferences table
      await pool.query(`
        INSERT INTO user_role_preferences (
          user_id, 
          preferred_role, 
          confidence_score, 
          detection_method, 
          behavioral_data, 
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          preferred_role = EXCLUDED.preferred_role,
          confidence_score = EXCLUDED.confidence_score,
          detection_method = EXCLUDED.detection_method,
          behavioral_data = EXCLUDED.behavioral_data,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId,
        roleData.detectedRole,
        roleData.confidence,
        roleData.method,
        JSON.stringify(roleData.behavioralData),
        roleData.cacheExpiration
      ]);
    }
    
    if (sessionId) {
      // Cache in session cache table
      await pool.query(`
        INSERT INTO user_session_cache (
          session_id,
          user_id,
          cache_key,
          cache_value,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (session_id, cache_key)
        DO UPDATE SET 
          cache_value = EXCLUDED.cache_value,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
      `, [
        sessionId,
        userId,
        'role_detection',
        JSON.stringify({
          role: roleData.detectedRole,
          confidence: roleData.confidence,
          method: roleData.method,
          behavioral_data: roleData.behavioralData
        }),
        roleData.cacheExpiration || new Date(Date.now() + CACHE_CONFIG.behavioralExpiration)
      ]);
    }
  } catch (error) {
    console.error('Cache role data error:', error);
  }
}

/**
 * Track behavioral data for future analysis
 */
async function trackBehavioralData(userId, sessionId, req, roleData) {
  try {
    const behaviorData = {
      page: req.path,
      method: req.method,
      query: req.query,
      user_agent: req.headers['user-agent'],
      referer: req.headers.referer,
      timestamp: new Date().toISOString()
    };
    
    // Determine role indicators based on current action
    const roleIndicators = {};
    if (roleData.detectedRole) {
      roleIndicators[roleData.detectedRole] = roleData.confidence;
    }
    
    await pool.query(`
      INSERT INTO user_behavioral_tracking (
        user_id,
        session_id,
        behavior_type,
        behavior_data,
        role_indicators,
        weight
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userId,
      sessionId,
      'page_view',
      JSON.stringify(behaviorData),
      JSON.stringify(roleIndicators),
      1.0
    ]);
  } catch (error) {
    console.error('Track behavioral data error:', error);
  }
}

/**
 * Generate client-side caching instructions
 */
function generateClientCacheInstructions(roleData) {
  if (!roleData.shouldCache) {
    return null;
  }
  
  return {
    localStorage: {
      [CACHE_CONFIG.localStorage.roleKey]: roleData.detectedRole,
      [CACHE_CONFIG.localStorage.confidenceKey]: roleData.confidence.toString(),
      [CACHE_CONFIG.localStorage.expirationKey]: roleData.cacheExpiration?.getTime().toString(),
      [CACHE_CONFIG.localStorage.behavioralKey]: JSON.stringify(roleData.behavioralData)
    },
    sessionStorage: {
      [CACHE_CONFIG.sessionStorage.routingMethodKey]: roleData.method
    },
    expiration: roleData.cacheExpiration
  };
}

/**
 * Middleware to inject client-side caching scripts
 */
export function injectRoleCacheScript(req, res, next) {
  if (req.roleDetection?.cacheInstructions) {
    const cacheScript = generateCacheScript(req.roleDetection.cacheInstructions);
    res.locals.roleCacheScript = cacheScript;
  }
  next();
}

/**
 * Generate JavaScript for client-side caching
 */
function generateCacheScript(cacheInstructions) {
  return `
    <script>
      (function() {
        try {
          // Cache role data in localStorage
          ${Object.entries(cacheInstructions.localStorage || {}).map(([key, value]) => 
            `localStorage.setItem('${key}', '${value}');`
          ).join('\n          ')}
          
          // Cache session data in sessionStorage  
          ${Object.entries(cacheInstructions.sessionStorage || {}).map(([key, value]) => 
            `sessionStorage.setItem('${key}', '${value}');`
          ).join('\n          ')}
          
          // Set expiration cleanup
          if (${cacheInstructions.expiration ? cacheInstructions.expiration.getTime() : 'null'}) {
            const expirationTime = ${cacheInstructions.expiration.getTime()};
            setTimeout(function() {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('arzani_')) {
                  localStorage.removeItem(key);
                }
              });
            }, expirationTime - Date.now());
          }
        } catch (error) {
          console.error('Role cache error:', error);
        }
      })();
    </script>
  `;
}

export { CACHE_CONFIG };
