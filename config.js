import dotenv from 'dotenv';
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'production',
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  emailSecret: process.env.EMAIL_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  
  // Domain configuration
  domain: {
    base: process.env.NODE_ENV === 'production' ? 'www.arzani.co.uk' : 'localhost:5000',
    protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
    get url() {
      return `${this.protocol}://${this.base}`;
    }
  },
  
  // Email configuration
  email: {
    from: 'no-reply@arzani.co.uk',
    name: 'Arzani Marketplace',
    service: process.env.EMAIL_SERVICE || 'SendGrid',
    sendGrid: {
      apiKey: process.env.SENDGRID_API_KEY
    },
    sendinBlue: {
      apiKey: process.env.SENDINBLUE_API_KEY
    }
  },
  
  // Database
  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  // AWS
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME
  },
  
  // Stripe
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  // OAuth providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000'}/auth/google/callback`
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: `${process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000'}/auth/microsoft/callback`,
      tenant: process.env.MICROSOFT_TENANT || 'common'
    }
  },
  
  // Session
  session: {
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? '.arzani.co.uk' : undefined
    }
  }
};

export default config;
