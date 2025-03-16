--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-03-16 08:42:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 265 (class 1255 OID 16688)
-- Name: assign_random_profile_picture(); Type: FUNCTION; Schema: public; Owner: marketplace_user
--

CREATE FUNCTION public.assign_random_profile_picture() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          IF NEW.profile_picture IS NULL THEN
              NEW.profile_picture := '/images/default_profile' || 
                  (floor(random() * 5) + 1)::text || '.png';
          END IF;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.assign_random_profile_picture() OWNER TO marketplace_user;

--
-- TOC entry 258 (class 1255 OID 16689)
-- Name: cleanup_old_history(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Keep last 6 months of history
    DELETE FROM business_history
    WHERE viewed_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_old_history() OWNER TO postgres;

--
-- TOC entry 259 (class 1255 OID 16690)
-- Name: is_valid_numeric(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_valid_numeric(text) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN $1 ~ '^-?([0-9]*[.])?[0-9]+$';
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$_$;


ALTER FUNCTION public.is_valid_numeric(text) OWNER TO postgres;

--
-- TOC entry 260 (class 1255 OID 16691)
-- Name: refresh_market_trends_mv(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_market_trends_mv() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.refresh_market_trends_mv() OWNER TO postgres;

--
-- TOC entry 261 (class 1255 OID 16692)
-- Name: refresh_market_trends_view(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_market_trends_view() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
END;
$$;


ALTER FUNCTION public.refresh_market_trends_view() OWNER TO postgres;

--
-- TOC entry 262 (class 1255 OID 16693)
-- Name: safe_to_numeric(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.safe_to_numeric(v text) RETURNS numeric
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN CASE 
        WHEN v IS NULL THEN 0
        WHEN v = '' THEN 0
        WHEN v ~ '^[0-9]+\.?[0-9]*$' THEN v::numeric
        ELSE 0
    END;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$_$;


ALTER FUNCTION public.safe_to_numeric(v text) OWNER TO postgres;

--
-- TOC entry 263 (class 1255 OID 16694)
-- Name: update_business_history_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_business_history_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_business_history_timestamp() OWNER TO postgres;

--
-- TOC entry 264 (class 1255 OID 16695)
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 253 (class 1259 OID 25326)
-- Name: ai_credits; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.ai_credits (
    id integer NOT NULL,
    user_id integer NOT NULL,
    credits_used integer DEFAULT 0,
    credits_limit integer DEFAULT 30,
    last_reset timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    next_reset timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval),
    subscription_tier character varying(50) DEFAULT 'free'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_credits OWNER TO marketplace_user;

--
-- TOC entry 252 (class 1259 OID 25325)
-- Name: ai_credits_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.ai_credits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_credits_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 252
-- Name: ai_credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.ai_credits_id_seq OWNED BY public.ai_credits.id;


--
-- TOC entry 255 (class 1259 OID 25357)
-- Name: assistant_interactions; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.assistant_interactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    response text NOT NULL,
    tokens_used integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    context jsonb,
    session_id character varying(255)
);


ALTER TABLE public.assistant_interactions OWNER TO marketplace_user;

--
-- TOC entry 254 (class 1259 OID 25356)
-- Name: assistant_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.assistant_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assistant_interactions_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 254
-- Name: assistant_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.assistant_interactions_id_seq OWNED BY public.assistant_interactions.id;


--
-- TOC entry 257 (class 1259 OID 25374)
-- Name: assistant_prompts; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.assistant_prompts (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    prompt_text text NOT NULL,
    category character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.assistant_prompts OWNER TO marketplace_user;

--
-- TOC entry 256 (class 1259 OID 25373)
-- Name: assistant_prompts_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.assistant_prompts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assistant_prompts_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5128 (class 0 OID 0)
-- Dependencies: 256
-- Name: assistant_prompts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.assistant_prompts_id_seq OWNED BY public.assistant_prompts.id;


--
-- TOC entry 223 (class 1259 OID 16696)
-- Name: business_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_history (
    id integer NOT NULL,
    user_id integer,
    business_id integer,
    action_type text,
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.business_history OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16703)
-- Name: business_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_history_id_seq OWNER TO postgres;

--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 224
-- Name: business_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_history_id_seq OWNED BY public.business_history.id;


--
-- TOC entry 225 (class 1259 OID 16704)
-- Name: business_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_images (
    id integer NOT NULL,
    business_id integer,
    image_url text NOT NULL
);


ALTER TABLE public.business_images OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16709)
-- Name: business_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_images_id_seq OWNER TO postgres;

--
-- TOC entry 5132 (class 0 OID 0)
-- Dependencies: 226
-- Name: business_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_images_id_seq OWNED BY public.business_images.id;


--
-- TOC entry 227 (class 1259 OID 16710)
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    business_name text,
    industry text,
    price numeric,
    cash_flow numeric,
    gross_revenue numeric,
    ebitda numeric,
    inventory numeric,
    sales_multiple numeric,
    profit_margin numeric,
    debt_service numeric,
    cash_on_cash numeric,
    down_payment numeric,
    location text,
    ffe numeric,
    employees integer,
    reason_for_selling text,
    description text,
    images text[],
    date_listed timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    years_in_operation integer,
    recurring_revenue_percentage numeric,
    growth_rate numeric,
    intellectual_property text[],
    website_traffic integer,
    social_media_followers integer,
    user_id integer,
    is_active boolean DEFAULT true,
    CONSTRAINT check_images_length CHECK ((array_length(images, 1) <= 5)),
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric)),
    CONSTRAINT valid_ebitda CHECK (((ebitda IS NULL) OR (ebitda >= ('-999999999'::integer)::numeric)))
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16720)
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.businesses_id_seq OWNER TO postgres;

--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 228
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- TOC entry 229 (class 1259 OID 16721)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    business_id integer,
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(20),
    email character varying(255),
    timeframe character varying(50),
    message text,
    newsletter boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16727)
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 230
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 231 (class 1259 OID 16728)
-- Name: document_exports; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.document_exports (
    id integer NOT NULL,
    user_id integer,
    file_id text NOT NULL,
    file_name text NOT NULL,
    export_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_exports OWNER TO marketplace_user;

--
-- TOC entry 232 (class 1259 OID 16734)
-- Name: document_exports_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.document_exports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_exports_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 232
-- Name: document_exports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.document_exports_id_seq OWNED BY public.document_exports.id;


--
-- TOC entry 233 (class 1259 OID 16735)
-- Name: industry_metrics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.industry_metrics AS
 SELECT industry,
    avg(cash_flow) AS avg_cash_flow,
    avg(ebitda) AS avg_ebitda,
    avg(sales_multiple) AS avg_sales_multiple,
    avg(profit_margin) AS avg_profit_margin,
    count(*) AS business_count
   FROM public.businesses
  GROUP BY industry;


ALTER VIEW public.industry_metrics OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16995)
-- Name: market_trends_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: marketplace_user
--

CREATE MATERIALIZED VIEW public.market_trends_mv AS
 SELECT row_number() OVER () AS unique_id,
    now() AS refresh_timestamp
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.market_trends_mv OWNER TO marketplace_user;

--
-- TOC entry 234 (class 1259 OID 16746)
-- Name: payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_history (
    id integer NOT NULL,
    user_id integer,
    stripe_payment_intent_id character varying(255),
    amount integer NOT NULL,
    currency character varying(3) NOT NULL,
    status character varying(50) NOT NULL,
    payment_method_type character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_history OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16750)
-- Name: payment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_history_id_seq OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 235
-- Name: payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_history_id_seq OWNED BY public.payment_history.id;


--
-- TOC entry 236 (class 1259 OID 16751)
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    name character varying(50),
    price numeric(10,2),
    description text,
    stripe_product_id character varying(255),
    stripe_price_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_plan_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16759)
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plans_id_seq OWNER TO postgres;

--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 237
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- TOC entry 238 (class 1259 OID 16760)
-- Name: saved_businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_businesses (
    id integer NOT NULL,
    user_id integer,
    business_id integer,
    saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.saved_businesses OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16764)
-- Name: saved_businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saved_businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saved_businesses_id_seq OWNER TO postgres;

--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 239
-- Name: saved_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_businesses_id_seq OWNED BY public.saved_businesses.id;


--
-- TOC entry 240 (class 1259 OID 16765)
-- Name: scraped_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scraped_data (
    id integer NOT NULL,
    source_url text NOT NULL,
    business_name text,
    industry text,
    price text,
    revenue numeric,
    ebitda numeric,
    location text,
    employees integer,
    valuation numeric,
    scraped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    net_profit text,
    price_text text,
    price_min numeric,
    price_max numeric
);


ALTER TABLE public.scraped_data OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16771)
-- Name: scraped_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scraped_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scraped_data_id_seq OWNER TO postgres;

--
-- TOC entry 5148 (class 0 OID 0)
-- Dependencies: 241
-- Name: scraped_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scraped_data_id_seq OWNED BY public.scraped_data.id;


--
-- TOC entry 242 (class 1259 OID 16772)
-- Name: subscription_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_events (
    id integer NOT NULL,
    user_id integer,
    event_type character varying(50) NOT NULL,
    plan_type character varying(50) NOT NULL,
    stripe_event_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_events OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16776)
-- Name: subscription_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_events_id_seq OWNER TO postgres;

--
-- TOC entry 5150 (class 0 OID 0)
-- Dependencies: 243
-- Name: subscription_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_events_id_seq OWNED BY public.subscription_events.id;


--
-- TOC entry 244 (class 1259 OID 16777)
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer,
    stripe_subscription_id character varying(255),
    plan_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    current_period_start timestamp without time zone NOT NULL,
    current_period_end timestamp without time zone NOT NULL,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subscription_status character varying(50) DEFAULT 'none'::character varying,
    subscription_end_date timestamp without time zone,
    trial_end_date timestamp without time zone
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16783)
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- TOC entry 5152 (class 0 OID 0)
-- Dependencies: 245
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- TOC entry 251 (class 1259 OID 17032)
-- Name: upload_requests; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.upload_requests (
    id integer NOT NULL,
    request_id text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    processed boolean DEFAULT true NOT NULL
);


ALTER TABLE public.upload_requests OWNER TO marketplace_user;

--
-- TOC entry 250 (class 1259 OID 17031)
-- Name: upload_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.upload_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.upload_requests_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5153 (class 0 OID 0)
-- Dependencies: 250
-- Name: upload_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.upload_requests_id_seq OWNED BY public.upload_requests.id;


--
-- TOC entry 246 (class 1259 OID 16784)
-- Name: users; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    google_id character varying(255),
    microsoft_id character varying(255),
    linkedin_id character varying(255),
    auth_provider character varying(20) DEFAULT 'email'::character varying,
    updated_at timestamp without time zone DEFAULT now(),
    profile_picture character varying(255),
    stripe_customer_id character varying(255),
    api_calls_count integer DEFAULT 0,
    subscription_end timestamp without time zone,
    subscription_type character varying(50) DEFAULT 'free'::character varying,
    google_tokens jsonb,
    s3_profile_picture text,
    CONSTRAINT profile_picture_s3_url CHECK (((s3_profile_picture IS NULL) OR (s3_profile_picture ~~ 'https://%s3.eu-north-1.amazonaws.com%'::text)))
);


ALTER TABLE public.users OWNER TO marketplace_user;

--
-- TOC entry 247 (class 1259 OID 16795)
-- Name: users_auth; Type: TABLE; Schema: public; Owner: marketplace_user
--

CREATE TABLE public.users_auth (
    user_id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_expires timestamp without time zone
);


ALTER TABLE public.users_auth OWNER TO marketplace_user;

--
-- TOC entry 248 (class 1259 OID 16801)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: marketplace_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO marketplace_user;

--
-- TOC entry 5154 (class 0 OID 0)
-- Dependencies: 248
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4833 (class 2604 OID 25329)
-- Name: ai_credits id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits ALTER COLUMN id SET DEFAULT nextval('public.ai_credits_id_seq'::regclass);


--
-- TOC entry 4841 (class 2604 OID 25360)
-- Name: assistant_interactions id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions ALTER COLUMN id SET DEFAULT nextval('public.assistant_interactions_id_seq'::regclass);


--
-- TOC entry 4844 (class 2604 OID 25377)
-- Name: assistant_prompts id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_prompts ALTER COLUMN id SET DEFAULT nextval('public.assistant_prompts_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 16945)
-- Name: business_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history ALTER COLUMN id SET DEFAULT nextval('public.business_history_id_seq'::regclass);


--
-- TOC entry 4800 (class 2604 OID 16946)
-- Name: business_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images ALTER COLUMN id SET DEFAULT nextval('public.business_images_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 16947)
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- TOC entry 4804 (class 2604 OID 16948)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 4806 (class 2604 OID 16949)
-- Name: document_exports id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports ALTER COLUMN id SET DEFAULT nextval('public.document_exports_id_seq'::regclass);


--
-- TOC entry 4808 (class 2604 OID 16950)
-- Name: payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history ALTER COLUMN id SET DEFAULT nextval('public.payment_history_id_seq'::regclass);


--
-- TOC entry 4810 (class 2604 OID 16951)
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- TOC entry 4813 (class 2604 OID 16952)
-- Name: saved_businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses ALTER COLUMN id SET DEFAULT nextval('public.saved_businesses_id_seq'::regclass);


--
-- TOC entry 4815 (class 2604 OID 16953)
-- Name: scraped_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data ALTER COLUMN id SET DEFAULT nextval('public.scraped_data_id_seq'::regclass);


--
-- TOC entry 4817 (class 2604 OID 16954)
-- Name: subscription_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events ALTER COLUMN id SET DEFAULT nextval('public.subscription_events_id_seq'::regclass);


--
-- TOC entry 4819 (class 2604 OID 16955)
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- TOC entry 4830 (class 2604 OID 17035)
-- Name: upload_requests id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests ALTER COLUMN id SET DEFAULT nextval('public.upload_requests_id_seq'::regclass);


--
-- TOC entry 4823 (class 2604 OID 16956)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5115 (class 0 OID 25326)
-- Dependencies: 253
-- Data for Name: ai_credits; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.ai_credits (id, user_id, credits_used, credits_limit, last_reset, next_reset, subscription_tier, created_at, updated_at) FROM stdin;
1	1	12	30	2025-03-15 17:24:53.552	2025-03-22 17:24:53.552	free	2025-03-15 17:24:53.552738	2025-03-16 07:38:30.436291
\.


--
-- TOC entry 5117 (class 0 OID 25357)
-- Dependencies: 255
-- Data for Name: assistant_interactions; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.assistant_interactions (id, user_id, message, response, tokens_used, created_at, context, session_id) FROM stdin;
1	1	hey chat	Hello! How can I assist you today with buying or selling a business on Arzani?	723	2025-03-15 21:20:46.918031	{"listingsCount": 19, "suggestionsCount": 3}	\N
2	1	What are the best businesses to buy I have a budget of £12323892	With a budget of £12,323,892, you have several options available on the Arzani marketplace. Here are a few businesses that fit within your budget:\n\n1. **LuxeJet Travel Services**  \n   - **Industry:** Agriculture  \n   - **Price:** £12,000,000  \n   - **Location:** London, UK  \n\n2. **Charlies Chocolates**  \n   - **Industry:** Agriculture  \n   - **Price:** £12,000,000  \n   - **Location:** London, UK  \n\nBoth businesses are priced at £12,000,000, leaving you with some budget flexibility for potential additional expenses or investment opportunities. If you're interested in a specific industry or location, feel free to let me know, and I can provide more tailored recommendations.	921	2025-03-15 21:21:26.709708	{"listingsCount": 19, "suggestionsCount": 3}	\N
3	1	hey chat	Hello! How can I assist you today with buying or selling a business on Arzani?	647	2025-03-15 21:24:21.370886	{"listingsCount": 19, "suggestionsCount": 3}	\N
4	1	I am buying a business and I want to buy a business in the travel industry do you have those	Yes, we have a business in the travel industry listed on our marketplace. Currently, we have LuxeJet Travel Services, which is located in London, UK, priced at £12,000,000. If you need further details or assistance with the purchasing process, feel free to let me know!	753	2025-03-15 21:24:50.651183	{"listingsCount": 19, "suggestionsCount": 3}	\N
5	1	okay cool can you take me to it	I'm unable to navigate directly to listings, but you can visit the Arzani marketplace and search for "LuxeJet Travel Services" in the travel industry section. If you need step-by-step guidance or have questions about the buying process, I'm here to help!	810	2025-03-15 21:25:09.356589	{"listingsCount": 19, "suggestionsCount": 3}	\N
6	1	Show me businesses in London	Here are the businesses currently listed in London:\n\n1. **LuxeJet Travel Services**\n   - Industry: Agriculture\n   - Price: £12,000,000\n\n2. **TechNova Electronics**\n   - Industry: Online & Technology\n   - Price: £240,000\n\n3. **Lark Manufacturers**\n   - Industry: Manufacturing\n   - Price: £1,500,000\n\n4. **Charlies Chocolates**\n   - Industry: Agriculture\n   - Price: £12,000,000\n\nIf you need more information about any of these businesses or have specific criteria, feel free to ask!	762	2025-03-16 05:39:10.857776	{"listingsCount": 19, "suggestionsCount": 3}	\N
7	1	What's my business worth?	Determining the worth of your business involves a thorough valuation process. Typically, this involves assessing your financial statements, understanding your business model, analysing your market position, and considering any unique assets or intellectual property you may own. Common methods for business valuation include the income approach, which considers future cash flows; the market approach, which compares your business to similar companies; and the asset-based approach, which sums up your business's assets.\n\nTo get a more accurate valuation, you might want to consult with a professional business valuer or accountant who can provide a detailed analysis tailored to your specific business and industry. They can help you understand the strengths of your business and how they impact its value. Additionally, keeping up-to-date with industry trends and market conditions can give you insights into potential valuation changes.	792	2025-03-16 05:47:17.730279	{"listingsCount": 19, "suggestionsCount": 3}	\N
8	1	What's my business worth?	Determining the value of your business involves several factors that come together to form a comprehensive understanding of its worth. Typically, the valuation process considers financial performance, assets, market conditions, and industry trends. Common methods include the Market Approach, which compares your business to similar ones that have recently sold; the Income Approach, which looks at your expected future earnings; and the Asset-Based Approach, which considers your net assets.\n\nTo get started, gather your financial statements, such as profit and loss statements, balance sheets, and cash flow statements, for the past few years. This information will provide a solid foundation for potential buyers or valuation experts to assess your business. Additionally, consider consulting with a professional business valuer or accountant who can provide a more tailored valuation based on your specific circumstances and industry standards.	793	2025-03-16 05:51:41.915435	{"listingsCount": 19, "suggestionsCount": 3}	\N
9	1	What's my business worth?	Determining the value of your business involves several factors and methodologies, often tailored to the specific industry and market conditions. The most common approaches include the asset-based approach, the income approach, and the market approach.\n\n1. **Asset-Based Approach**: This method involves calculating the total value of your business's assets and subtracting any liabilities. It's often used for businesses with significant tangible assets.\n\n2. **Income Approach**: This focuses on the future earning potential of your business. It involves calculating the present value of expected future cash flows or profits, often using a discount rate. This approach is common for businesses with strong, predictable revenue streams.\n\n3. **Market Approach**: This method compares your business to similar businesses that have been sold recently. It involves looking at multiples such as the price-to-earnings ratio or revenue multiples.\n\nFor a more precise valuation, you might consider hiring a professional business valuer or accountant who can provide a detailed analysis based on your financial statements, market conditions, and industry trends.	838	2025-03-16 05:58:10.088201	{"listingsCount": 19, "suggestionsCount": 3}	\N
10	1	What's my business worth?	To determine the worth of your business, you would typically undergo a business valuation process. This involves several steps and methods, often depending on the nature and size of your business. Common valuation methods include:\n\n1. **Asset-Based Approach**: This method calculates the total value of your business's assets minus its liabilities. It's often used for businesses with significant physical assets.\n\n2. **Market Value Approach**: This involves comparing your business to similar businesses that have been sold recently. It can be effective if there is a good amount of comparable data available in the market.\n\n3. **Income Approach**: This approach values your business based on its ability to generate future income or cash flow. Techniques such as Discounted Cash Flow (DCF) analysis or Capitalization of Earnings are often applied here.\n\nIt's advisable to consult with a professional business appraiser or financial advisor who can provide a detailed assessment tailored to your specific business, considering factors like industry trends, market conditions, and financial performance.	830	2025-03-16 06:23:04.25071	{"listingsCount": 19, "suggestionsCount": 3}	\N
11	1	Help me find a business to buy	Certainly! To help you find a suitable business to purchase, could you please provide more details about your preferences? Specifically, it would be helpful to know:\n\n1. **Industry**: Are there any particular industries you are interested in?\n2. **Location**: Do you have a preferred location in the UK?\n3. **Budget**: What is your price range for buying a business?\n\nWith this information, I can narrow down the options and suggest businesses that match your criteria.	735	2025-03-16 07:38:22.873385	{"listingsCount": 19, "suggestionsCount": 3}	\N
12	1	What's my business worth?	Determining the value of your business involves several factors and methods. Here are some key points to consider:\n\n1. **Financial Performance**: The value of your business is often linked to its financial performance. This includes reviewing your profit and loss statements, balance sheets, and cash flow statements. Buyers typically look at metrics such as revenue, profit margins, and growth trends over the past few years.\n\n2. **Valuation Methods**: Common methods for valuing a business include the earnings multiple approach, where the value is based on a multiple of the business's earnings before interest, taxes, depreciation, and amortisation (EBITDA). Other methods include discounted cash flow analysis and asset-based valuation.\n\n3. **Market Conditions**: The current market environment can also impact your business's value. This includes industry trends, economic conditions, and the demand for businesses in your sector. \n\nTo get a more precise valuation, you may want to engage with a professional business valuer or an accountant who can provide a detailed analysis based on your specific business data and market conditions.	960	2025-03-16 07:38:30.435287	{"listingsCount": 19, "suggestionsCount": 3}	\N
\.


--
-- TOC entry 5119 (class 0 OID 25374)
-- Dependencies: 257
-- Data for Name: assistant_prompts; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.assistant_prompts (id, title, prompt_text, category, created_at) FROM stdin;
1	Find Business	Show me businesses in {location}	search	2025-03-15 21:20:06.048714
2	Valuation	What is a fair price for a {industry} business?	valuation	2025-03-15 21:20:06.048714
3	Selling Tips	How can I increase the value of my business?	selling	2025-03-15 21:20:06.048714
\.


--
-- TOC entry 5086 (class 0 OID 16696)
-- Dependencies: 223
-- Data for Name: business_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_history (id, user_id, business_id, action_type, viewed_at, metadata) FROM stdin;
1	1	13	view_details	2025-01-12 11:01:54.298146	{}
2	1	12	view_details	2025-01-12 11:01:57.351885	{}
3	1	13	view_details	2025-01-12 11:10:05.368703	{}
4	1	11	view_details	2025-01-12 12:03:50.023331	{}
5	1	13	view_details	2025-01-12 12:07:50.884086	{}
6	1	12	view_details	2025-01-12 12:07:54.655059	{}
7	1	13	view_details	2025-01-12 12:38:24.499791	{}
8	1	13	view_details	2025-01-12 13:03:19.995572	{}
9	1	13	view_details	2025-01-12 13:05:31.084601	{}
10	1	13	view_details	2025-01-12 13:14:18.706843	{}
11	1	13	view_details	2025-01-12 13:14:24.22465	{}
12	1	13	view_details	2025-01-12 13:14:26.57396	{}
13	1	13	view_details	2025-01-12 13:14:29.653273	{}
14	1	13	view_details	2025-01-12 13:15:16.713838	{}
15	1	13	view_details	2025-01-12 13:15:19.520013	{}
16	1	13	view_details	2025-01-12 13:15:23.257463	{}
17	1	13	view_details	2025-01-12 13:15:27.039357	{}
18	1	13	view_details	2025-01-12 13:30:01.686044	{}
19	1	13	view_details	2025-01-12 13:33:56.572709	{}
20	1	13	view_details	2025-01-12 13:33:58.980428	{}
21	1	13	view_details	2025-01-12 13:52:03.586999	{}
22	1	13	view_details	2025-01-12 14:10:56.386032	{}
23	1	13	view_details	2025-01-12 19:39:02.840723	{}
24	1	13	view_details	2025-01-12 19:43:11.623195	{}
25	1	13	contact_seller	2025-01-12 19:43:15.618877	{}
26	1	13	contact_seller	2025-01-12 19:43:22.197553	{}
27	1	12	view_details	2025-01-12 19:43:24.244383	{}
28	1	11	view_details	2025-01-12 19:43:36.089561	{}
29	1	2	view_details	2025-01-12 20:05:53.78499	{}
30	1	13	view_details	2025-01-12 20:10:46.291908	{}
31	1	13	view_details	2025-01-12 20:11:11.114162	{}
32	1	12	view_details	2025-01-12 20:11:15.301782	{}
33	1	11	view_details	2025-01-12 21:26:38.781176	{}
34	1	13	view_details	2025-01-14 07:30:37.547082	{}
35	1	13	view_details	2025-01-14 13:39:49.995589	{}
36	1	13	view_details	2025-01-16 11:03:34.253295	{}
37	1	10	view_details	2025-01-16 11:03:41.016068	{}
38	1	13	view_details	2025-01-16 12:04:50.776663	{}
39	1	5	view_details	2025-01-16 17:44:14.617135	{}
40	1	13	contact_seller	2025-01-16 18:00:01.271859	{}
41	1	13	view_details	2025-01-16 18:05:41.137922	{}
42	1	13	view_details	2025-01-16 18:21:04.859479	{}
43	1	13	view_details	2025-01-16 18:22:15.911545	{}
44	1	4	view_details	2025-01-16 18:22:53.766879	{}
45	1	9	view_details	2025-01-16 18:22:56.541487	{}
46	1	13	contact_seller	2025-01-16 18:23:46.543214	{}
47	1	13	view_details	2025-01-16 21:22:56.993124	{}
48	1	13	view_details	2025-01-16 21:23:02.460245	{}
49	1	13	contact_seller	2025-01-16 21:24:31.442368	{}
50	1	13	contact_seller	2025-01-16 21:24:48.638445	{}
51	1	13	view_details	2025-01-17 12:47:08.403063	{}
52	1	14	view_details	2025-01-24 19:23:14.406938	{}
53	1	14	view_details	2025-01-24 19:38:44.487813	{}
54	1	14	view_details	2025-01-24 19:44:57.220803	{}
55	1	14	view_details	2025-01-24 19:45:18.829321	{}
56	1	13	view_details	2025-01-24 19:49:07.441543	{}
57	1	14	view_details	2025-01-24 19:49:11.725081	{}
58	1	14	view_details	2025-01-24 19:51:35.41495	{}
59	1	14	view_details	2025-01-24 20:10:43.186468	{}
60	1	15	view_details	2025-01-24 21:20:42.47758	{}
61	1	15	view_details	2025-01-25 08:27:21.20209	{}
62	1	15	view_details	2025-01-25 08:30:11.28921	{}
63	1	15	view_details	2025-01-25 08:35:52.840049	{}
64	1	14	view_details	2025-01-25 08:37:55.090577	{}
65	1	14	view_details	2025-01-27 07:55:18.500122	{}
66	1	17	view_details	2025-01-30 19:43:11.303833	{}
67	1	17	view_details	2025-02-01 21:33:36.099193	{}
68	1	17	view_details	2025-02-01 22:09:20.200994	{}
69	1	17	view_details	2025-02-01 22:17:33.96055	{}
70	1	17	view_details	2025-02-01 22:22:15.248906	{}
71	1	17	view_details	2025-02-01 22:22:15.319073	{}
72	1	17	view_details	2025-02-01 22:22:15.322631	{}
73	1	17	view_details	2025-02-02 06:10:18.382814	{}
74	1	17	view_details	2025-02-02 13:18:53.659119	{}
75	1	17	view_details	2025-02-02 19:52:16.939072	{}
76	1	15	contact_seller	2025-02-04 14:36:21.90267	{}
77	1	17	view_details	2025-02-06 14:30:52.391876	{}
78	1	17	contact_seller	2025-02-06 14:33:18.648889	{}
79	1	17	view_details	2025-02-11 16:05:43.95035	{}
80	1	17	view_details	2025-02-18 09:22:10.776765	{}
81	1	17	view_details	2025-02-20 18:20:51.855843	{}
82	1	13	view_details	2025-02-21 03:24:17.227438	{}
83	1	13	view_details	2025-02-21 04:00:27.234853	{}
84	1	19	view_details	2025-02-21 09:27:59.591187	{}
85	1	18	view_details	2025-02-21 09:39:20.404553	{}
86	1	17	view_details	2025-02-21 09:39:28.362637	{}
87	1	17	view_details	2025-02-21 09:39:28.464521	{}
88	1	18	view_details	2025-02-21 09:57:29.509314	{}
89	1	19	view_details	2025-02-21 09:57:49.821676	{}
90	1	17	view_details	2025-02-21 09:57:53.704998	{}
91	1	19	view_details	2025-02-21 10:36:11.835048	{}
92	1	19	contact_seller	2025-03-05 19:35:07.086947	{}
93	1	19	view_details	2025-03-05 19:35:11.158243	{}
94	1	19	contact_seller	2025-03-05 20:32:53.778952	{}
95	1	19	contact_seller	2025-03-05 20:38:44.267211	{}
96	1	19	contact_seller	2025-03-05 20:39:08.704582	{}
97	1	19	contact_seller	2025-03-05 20:39:11.100406	{}
98	1	19	contact_seller	2025-03-05 20:43:21.620444	{}
99	1	19	contact_seller	2025-03-05 20:46:21.768449	{}
100	1	19	contact_seller	2025-03-05 20:53:30.410634	{}
101	1	19	contact_seller	2025-03-05 20:56:39.124645	{}
102	1	19	contact_seller	2025-03-05 20:56:44.571144	{}
103	1	19	contact_seller	2025-03-05 20:57:01.414426	{}
104	1	19	contact_seller	2025-03-05 20:58:41.362935	{}
105	1	19	contact_seller	2025-03-05 20:59:04.473389	{}
106	1	19	contact_seller	2025-03-05 20:59:07.641484	{}
107	1	19	contact_seller	2025-03-05 20:59:20.397481	{}
108	1	14	contact_seller	2025-03-05 20:59:24.162886	{}
109	1	11	view_details	2025-03-15 17:24:34.277005	{}
110	1	12	view_details	2025-03-15 17:24:42.60553	{}
111	1	19	view_details	2025-03-15 17:24:54.871219	{}
112	1	23	contact_seller	2025-03-16 05:49:06.911044	{}
113	1	23	view_details	2025-03-16 05:49:19.699457	{}
114	1	23	view_details	2025-03-16 05:50:04.373553	{}
115	1	23	view_details	2025-03-16 08:19:03.159893	{}
\.


--
-- TOC entry 5088 (class 0 OID 16704)
-- Dependencies: 225
-- Data for Name: business_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_images (id, business_id, image_url) FROM stdin;
\.


--
-- TOC entry 5090 (class 0 OID 16710)
-- Dependencies: 227
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, business_name, industry, price, cash_flow, gross_revenue, ebitda, inventory, sales_multiple, profit_margin, debt_service, cash_on_cash, down_payment, location, ffe, employees, reason_for_selling, description, images, date_listed, years_in_operation, recurring_revenue_percentage, growth_rate, intellectual_property, website_traffic, social_media_followers, user_id, is_active) FROM stdin;
13	Coca Cola	Wholesale & Distributors	100000	10	100	100	100	10	100	10	100	10	100	100	1000	Because I'm Retiring 	I felt like it I am the most insane human ever	{{90082cd4dcdbce6cbe521b5b40c73a7e}}	2024-12-31 13:36:48.951708	\N	\N	\N	\N	\N	\N	\N	t
1	1546	Agriculture	56	56	51	6	51	1	6	55	5	66	5	5	6	5	5	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/1/images-1734521048864-980329172.jpg}	2024-12-18 11:24:08.913743	\N	\N	\N	\N	\N	\N	\N	t
2	SSA	Agriculture	456465	45654	56546	546	65	56	56	65	65	56	65	54	5	fjdsfsab	fjodfbsdioufdhiofdf	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/2/images-1734573856681-251882599.jpg}	2024-12-19 02:04:16.724059	\N	\N	\N	\N	\N	\N	\N	t
3	SSA	Agriculture	456465	45654	56546	546	65	56	56	65	65	56	65	54	5	fjdsfsab	fjodfbsdioufdhiofdf	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/3/images-1734573885783-411717603.jpg}	2024-12-19 02:04:45.828062	\N	\N	\N	\N	\N	\N	\N	t
4	asdads	Agriculture	56	5	65	5	5	56	65	56	15	6	5	65	56	56	56	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/4/images-1734579554511-625269627.jpg}	2024-12-19 03:39:14.558391	\N	\N	\N	\N	\N	\N	\N	t
5	sds	Agriculture	98	8	88	5	5	6	5	5	546	6	5	56	65	5	6	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/5/images-1734579608949-904977548.jpg}	2024-12-19 03:40:08.987991	\N	\N	\N	\N	\N	\N	\N	t
6	sdjo	Agriculture	54	5656	74	58	65	65	65	5	6	5	32	2	365	56	65	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/6/images-1734580979249-109411765.jpg}	2024-12-19 04:02:59.392444	\N	\N	\N	\N	\N	\N	\N	t
7	645	Agriculture	51	665	165	56	651	6	65	6	5	1	56	65	65	6	56	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/7/images-1734581860871-315939525.jpg}	2024-12-19 04:17:40.910398	\N	\N	\N	\N	\N	\N	\N	t
8	csd	Agriculture	56	456	56	56	58966	65	65	65	26	23	65	56	56	65	dsdlkm	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/8/images-1734582270697-796840027.jpg}	2024-12-19 04:24:30.746275	\N	\N	\N	\N	\N	\N	\N	t
9	dsds	Agriculture	56	654	56	56	65	65	56	561	6651	6165	61	16	5156	15	6	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/9/images-1734583323281-388768466.jpg}	2024-12-19 04:42:03.324876	\N	\N	\N	\N	\N	\N	\N	t
10	dsd	Agriculture	5	5	5	5	65	56	56	56	56	65	5	6	56	56	65	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/10/images-1734584145410-382457799.jpg}	2024-12-19 04:55:45.487027	\N	\N	\N	\N	\N	\N	\N	t
11	\N	Agriculture	2654	54	56	5	56	56	56	65	1	56	56	65	15	61	65	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/11/images-1734710341626-995593969.jpg}	2024-12-20 15:59:01.775242	\N	\N	\N	\N	\N	\N	\N	t
12	\N	Beauty & Personal Care	56516	156	1	51	56	2	1	6	51	6	156	5	56	55	61	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/12/images-1734710380781-2269971.jpg}	2024-12-20 15:59:40.833475	\N	\N	\N	\N	\N	\N	\N	t
15	Pizza 4 U 	Restaurants & Food	250000	75000	500000	90000	10000	3	18	20000	12	50000	Manchester, UK	40000	12	Owner relocating to another country.\r\n\r\n	This pizza company is a thriving business located in the heart of Manchester, known for its handcrafted pizzas made from fresh, locally sourced ingredients. The menu includes a variety of traditional and signature pizzas, catering to both dine-in and delivery customers. The business has a well-established customer base, with strong online presence and rave reviews across platforms. Featuring a modern dining area, efficient kitchen setup, and delivery partnerships with platforms like Deliveroo and Uber Eats, this business is poised for continued growth. A perfect opportunity for someone looking to own a successful pizzeria with a proven track record.	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/15/business-1737753636404-516978295.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/15/business-1737753636411-25036649.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/15/business-1737753636437-581067930.png}	2025-01-24 21:20:36.450482	5	\N	\N	\N	\N	\N	1	t
14	Charlies Chocolates 	Agriculture	12000000	120000	500000	150000	20000	3	25	30000	12	100000	London, UK	50000	15	Retirement, health issues, pursuing new opportunities	This business is a premium chocolate manufacturing company renowned for its artisanal, high-quality products. Operating in a modern facility, it specializes in crafting unique flavors and luxury chocolates using sustainably sourced ingredients. The company has a strong brand presence, supplying to major retailers, boutique shops, and direct-to-consumer channels through its well-established online store. With proprietary recipes, scalable production capabilities, and a loyal customer base, this is an exceptional opportunity for a buyer looking to enter or expand in the lucrative confectionery industry.	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/14/business-1737746570750-53793207.png,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/14/business-1737746570758-32958918.png,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/14/business-1737746570760-187761928.png}	2025-01-24 19:22:50.773051	8	\N	\N	\N	\N	\N	1	t
17	Lark Manufacturers	Manufacturing	1500000	50000	300000	65000	25000	2.5	22	15000	12	40000	London, UK	15000	6	Owner pursuing new business opportunities.	This clothing company is a boutique fashion brand based in London, specializing in sustainable, trend-forward apparel for men and women. The brand is well-known for its high-quality, eco-friendly materials and exclusive designs. The company has a loyal customer base and operates both in-store and online, with an efficient e-commerce platform and excellent delivery logistics. Its curated social media presence drives strong engagement, while its subscription model for seasonal collections ensures recurring revenue. The company is fully equipped with modern point-of-sale systems, stylish fixtures, and inventory ready for continued operations. This is an excellent opportunity to acquire a well-established, growing fashion brand.	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/17/business-1737964230915-364938365.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/17/business-1737964230922-889788037.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/17/business-1737964230923-133261277.png}	2025-01-27 07:50:30.933561	7	\N	\N	\N	\N	\N	1	t
18	TechNova Electronics	Online & Technology	240000	50000	250000	60000	30000	4	20	15000	12	40000	London, UK	25000	8	Retiring	A thriving electronics retailer with strong online and physical presence, offering cutting-edge products and reliable customer service.	{business-1740109391501-1730041.jpg,business-1740109391506-894972832.jpg,business-1740109391509-941509614.jpg}	2025-02-21 03:43:11.517007	7	\N	\N	\N	\N	\N	1	t
19	EduSpark Academy	Education & Children	280000	60000	500000	80000	40000	5	18	20000	15	50000	Manchester, UK	30000	12	 Owner transitioning to a new venture	A leading education center providing innovative learning experiences and child development programs, blending in-person and digital education for sustained growth.	{business-1740130018837-185955280.jpg,business-1740130018862-453500534.jpg,business-1740130018874-649135708.jpg}	2025-02-21 09:26:58.882754	10	\N	\N	\N	\N	\N	1	t
23	 LuxeJet Travel Services	Agriculture	12000000	250000	1800000	320000	50000	4.8	17.8	100000	22	300000	 London, UK	75000	15	Owner retiring and relocating	LuxeJet Travel Services is a well-established luxury travel agency specializing in bespoke travel experiences, VIP concierge services, and exclusive holiday packages. The business has a strong reputation, high client retention, and partnerships with premium hotels and airlines. With a growing online presence and a scalable model, this is a prime opportunity for an investor looking to enter the luxury travel sector.	{https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/1/business-1741255785212-449852344.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/1/business-1741255785213-262137139.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/1/business-1741255785213-218181614.jpg,https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/1/business-1741255785213-294402867.jpg}	2025-03-06 10:09:55.694104	12	\N	\N	\N	\N	\N	1	t
\.


--
-- TOC entry 5092 (class 0 OID 16721)
-- Dependencies: 229
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, business_id, first_name, last_name, phone, email, timeframe, message, newsletter, created_at) FROM stdin;
\.


--
-- TOC entry 5094 (class 0 OID 16728)
-- Dependencies: 231
-- Data for Name: document_exports; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.document_exports (id, user_id, file_id, file_name, export_date) FROM stdin;
\.


--
-- TOC entry 5096 (class 0 OID 16746)
-- Dependencies: 234
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_history (id, user_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, created_at) FROM stdin;
\.


--
-- TOC entry 5098 (class 0 OID 16751)
-- Dependencies: 236
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, price, description, stripe_product_id, stripe_price_id, created_at, updated_at) FROM stdin;
1	gold	39.00	Gold Plan with verified ID and ScoutSights	prod_RWAM5xjyVPSxGJ	price_xxx	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
2	platinum	50.00	Platinum Plan with all features including Off Market Leads	prod_RWAVR2LGingUrm	price_yyy	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
\.


--
-- TOC entry 5100 (class 0 OID 16760)
-- Dependencies: 238
-- Data for Name: saved_businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_businesses (id, user_id, business_id, saved_at) FROM stdin;
35	1	23	2025-03-16 07:29:35.749419+00
\.


--
-- TOC entry 5102 (class 0 OID 16765)
-- Dependencies: 240
-- Data for Name: scraped_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraped_data (id, source_url, business_name, industry, price, revenue, ebitda, location, employees, valuation, scraped_at, net_profit, price_text, price_min, price_max) FROM stdin;
\.


--
-- TOC entry 5104 (class 0 OID 16772)
-- Dependencies: 242
-- Data for Name: subscription_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_events (id, user_id, event_type, plan_type, stripe_event_id, created_at) FROM stdin;
\.


--
-- TOC entry 5106 (class 0 OID 16777)
-- Dependencies: 244
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, stripe_subscription_id, plan_type, status, current_period_start, current_period_end, cancelled_at, created_at, updated_at, subscription_status, subscription_end_date, trial_end_date) FROM stdin;
\.


--
-- TOC entry 5113 (class 0 OID 17032)
-- Dependencies: 251
-- Data for Name: upload_requests; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.upload_requests (id, request_id, user_id, created_at, processed) FROM stdin;
\.


--
-- TOC entry 5108 (class 0 OID 16784)
-- Dependencies: 246
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users (id, username, email, created_at, google_id, microsoft_id, linkedin_id, auth_provider, updated_at, profile_picture, stripe_customer_id, api_calls_count, subscription_end, subscription_type, google_tokens, s3_profile_picture) FROM stdin;
2	ZumaTornado1	zumaadekoya@gmail.com	2024-12-31 16:15:09.305415	\N	\N	\N	email	2025-01-07 23:29:47.507655	\N	\N	0	\N	free	\N	\N
3	ZumaTornado1	michaeladekoya321@gmail.com	2025-03-05 09:26:56.881968	\N	\N	\N	email	2025-03-05 09:26:56.881968	/images/default_profile5.png	\N	0	\N	free	\N	\N
4	ZumaTornado1	notzuma123@gmail.com	2025-03-05 11:11:30.393493	\N	\N	\N	email	2025-03-05 11:11:30.393493	/images/default_profile1.png	\N	0	\N	free	\N	\N
1	ZumaTornado1	michaaldekoya@gmail.com	2024-12-31 08:47:47.558134	\N	\N	\N	email	2025-01-09 01:09:04.665839	/uploads/profiles/profile-1736384944604-797407904.png	cus_RtBXjRXZ6OJ9Tg	0	\N	free	\N	\N
\.


--
-- TOC entry 5109 (class 0 OID 16795)
-- Dependencies: 247
-- Data for Name: users_auth; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users_auth (user_id, password_hash, verified, verification_token, verification_expires) FROM stdin;
1	$2b$10$W6mEBMR260jQtrIegGeQM.JQ0FJJT5E9tj06ZAaWRds0b5w72GxZ2	t	\N	\N
2	$2b$10$VbZChMxme0i6qQ7gOBtESe47uOzNHRer/5lvAM1kDbn8NF5QwAm7u	t	\N	\N
3	$2b$10$w4lfuJIdETe6SgD6sWi6IePA50/C9HBhxapOGpKTqWe89bqcm4hMK	f	\N	\N
4	$2b$10$HkqVayn7O/pQL9OiCY7Bi.Z5ePDJpMvWvpeWuhDf1zqmFDc.4OTQe	t	\N	\N
\.


--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 252
-- Name: ai_credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.ai_credits_id_seq', 3, true);


--
-- TOC entry 5156 (class 0 OID 0)
-- Dependencies: 254
-- Name: assistant_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.assistant_interactions_id_seq', 12, true);


--
-- TOC entry 5157 (class 0 OID 0)
-- Dependencies: 256
-- Name: assistant_prompts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.assistant_prompts_id_seq', 3, true);


--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 224
-- Name: business_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_history_id_seq', 115, true);


--
-- TOC entry 5159 (class 0 OID 0)
-- Dependencies: 226
-- Name: business_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_images_id_seq', 1, false);


--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 228
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.businesses_id_seq', 23, true);


--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 230
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 232
-- Name: document_exports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.document_exports_id_seq', 1, false);


--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 235
-- Name: payment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_history_id_seq', 1, false);


--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 237
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 2, true);


--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 239
-- Name: saved_businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_businesses_id_seq', 35, true);


--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 241
-- Name: scraped_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scraped_data_id_seq', 1, false);


--
-- TOC entry 5167 (class 0 OID 0)
-- Dependencies: 243
-- Name: subscription_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_events_id_seq', 1, false);


--
-- TOC entry 5168 (class 0 OID 0)
-- Dependencies: 245
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 250
-- Name: upload_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.upload_requests_id_seq', 1, false);


--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 248
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- TOC entry 4916 (class 2606 OID 25338)
-- Name: ai_credits ai_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits
    ADD CONSTRAINT ai_credits_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 25366)
-- Name: assistant_interactions assistant_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions
    ADD CONSTRAINT assistant_interactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4922 (class 2606 OID 25382)
-- Name: assistant_prompts assistant_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_prompts
    ADD CONSTRAINT assistant_prompts_pkey PRIMARY KEY (id);


--
-- TOC entry 4852 (class 2606 OID 16815)
-- Name: business_history business_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4860 (class 2606 OID 16817)
-- Name: business_images business_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 16819)
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4867 (class 2606 OID 16821)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 16823)
-- Name: document_exports document_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports
    ADD CONSTRAINT document_exports_pkey PRIMARY KEY (id);


--
-- TOC entry 4873 (class 2606 OID 16825)
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4875 (class 2606 OID 16827)
-- Name: payment_history payment_history_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- TOC entry 4877 (class 2606 OID 16829)
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 16831)
-- Name: saved_businesses saved_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4883 (class 2606 OID 16833)
-- Name: saved_businesses saved_businesses_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 4885 (class 2606 OID 16835)
-- Name: scraped_data scraped_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data
    ADD CONSTRAINT scraped_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4887 (class 2606 OID 16837)
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4891 (class 2606 OID 16839)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4893 (class 2606 OID 16841)
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- TOC entry 4858 (class 2606 OID 16843)
-- Name: business_history unique_recent_view; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT unique_recent_view UNIQUE (user_id, business_id, viewed_at);


--
-- TOC entry 4912 (class 2606 OID 17041)
-- Name: upload_requests upload_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests
    ADD CONSTRAINT upload_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4914 (class 2606 OID 17043)
-- Name: upload_requests upload_requests_request_id_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests
    ADD CONSTRAINT upload_requests_request_id_key UNIQUE (request_id);


--
-- TOC entry 4907 (class 2606 OID 16845)
-- Name: users_auth users_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4900 (class 2606 OID 16847)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4902 (class 2606 OID 16849)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4904 (class 2606 OID 16851)
-- Name: users users_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- TOC entry 4917 (class 1259 OID 25344)
-- Name: idx_ai_credits_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_ai_credits_user_id ON public.ai_credits USING btree (user_id);


--
-- TOC entry 4920 (class 1259 OID 25372)
-- Name: idx_assistant_interactions_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_assistant_interactions_user_id ON public.assistant_interactions USING btree (user_id);


--
-- TOC entry 4853 (class 1259 OID 16852)
-- Name: idx_business_history_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_business ON public.business_history USING btree (business_id);


--
-- TOC entry 4854 (class 1259 OID 16853)
-- Name: idx_business_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user ON public.business_history USING btree (user_id);


--
-- TOC entry 4855 (class 1259 OID 16854)
-- Name: idx_business_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user_id ON public.business_history USING btree (user_id);


--
-- TOC entry 4856 (class 1259 OID 16855)
-- Name: idx_business_history_viewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_viewed_at ON public.business_history USING btree (viewed_at);


--
-- TOC entry 4868 (class 1259 OID 16856)
-- Name: idx_contacts_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_business_id ON public.contacts USING btree (business_id);


--
-- TOC entry 4863 (class 1259 OID 16857)
-- Name: idx_date_listed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_date_listed ON public.businesses USING btree (date_listed);


--
-- TOC entry 4864 (class 1259 OID 16858)
-- Name: idx_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_industry ON public.businesses USING btree (industry);


--
-- TOC entry 4865 (class 1259 OID 16859)
-- Name: idx_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location ON public.businesses USING btree (location);


--
-- TOC entry 4871 (class 1259 OID 16860)
-- Name: idx_payment_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_user_id ON public.payment_history USING btree (user_id);


--
-- TOC entry 4878 (class 1259 OID 16861)
-- Name: idx_saved_businesses_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_business ON public.saved_businesses USING btree (business_id);


--
-- TOC entry 4879 (class 1259 OID 16862)
-- Name: idx_saved_businesses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_user ON public.saved_businesses USING btree (user_id);


--
-- TOC entry 4888 (class 1259 OID 16863)
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- TOC entry 4889 (class 1259 OID 16864)
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- TOC entry 4909 (class 1259 OID 17044)
-- Name: idx_upload_requests_request_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_upload_requests_request_id ON public.upload_requests USING btree (request_id);


--
-- TOC entry 4910 (class 1259 OID 17045)
-- Name: idx_upload_requests_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_upload_requests_user_id ON public.upload_requests USING btree (user_id);


--
-- TOC entry 4894 (class 1259 OID 16865)
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider);


--
-- TOC entry 4905 (class 1259 OID 16866)
-- Name: idx_users_auth_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_user_id ON public.users_auth USING btree (user_id);


--
-- TOC entry 4895 (class 1259 OID 16867)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4896 (class 1259 OID 16868)
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- TOC entry 4897 (class 1259 OID 16869)
-- Name: idx_users_linkedin_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_linkedin_id ON public.users USING btree (linkedin_id);


--
-- TOC entry 4898 (class 1259 OID 16870)
-- Name: idx_users_microsoft_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_microsoft_id ON public.users USING btree (microsoft_id);


--
-- TOC entry 4908 (class 1259 OID 16999)
-- Name: market_trends_mv_unique_idx; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE UNIQUE INDEX market_trends_mv_unique_idx ON public.market_trends_mv USING btree (unique_id);


--
-- TOC entry 4937 (class 2620 OID 16874)
-- Name: businesses refresh_market_trends; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_market_trends AFTER INSERT OR DELETE OR UPDATE ON public.businesses FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_market_trends_mv();


--
-- TOC entry 4938 (class 2620 OID 25412)
-- Name: users set_default_profile_picture; Type: TRIGGER; Schema: public; Owner: marketplace_user
--

CREATE TRIGGER set_default_profile_picture BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.assign_random_profile_picture();


--
-- TOC entry 4935 (class 2606 OID 25339)
-- Name: ai_credits ai_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits
    ADD CONSTRAINT ai_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4923 (class 2606 OID 16876)
-- Name: business_history business_history_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4924 (class 2606 OID 16881)
-- Name: business_history business_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4925 (class 2606 OID 16886)
-- Name: business_images business_images_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4926 (class 2606 OID 16891)
-- Name: businesses businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4927 (class 2606 OID 16896)
-- Name: contacts contacts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- TOC entry 4928 (class 2606 OID 16901)
-- Name: document_exports document_exports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports
    ADD CONSTRAINT document_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4936 (class 2606 OID 25367)
-- Name: assistant_interactions fk_user; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 16906)
-- Name: payment_history payment_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4930 (class 2606 OID 16911)
-- Name: saved_businesses saved_businesses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 16916)
-- Name: saved_businesses saved_businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 16921)
-- Name: subscription_events subscription_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4933 (class 2606 OID 16926)
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4934 (class 2606 OID 16931)
-- Name: users_auth users_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO marketplace_user;


--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE business_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.business_history TO marketplace_user;


--
-- TOC entry 5131 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE business_images; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.business_images TO marketplace_user;


--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE businesses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.businesses TO marketplace_user;


--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE businesses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.businesses_id_seq TO marketplace_user;


--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contacts TO marketplace_user;


--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.contacts_id_seq TO marketplace_user;


--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE industry_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.industry_metrics TO marketplace_user;


--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE payment_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_history TO marketplace_user;


--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.plans TO marketplace_user;


--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE saved_businesses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.saved_businesses TO marketplace_user;


--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE scraped_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scraped_data TO marketplace_user;


--
-- TOC entry 5149 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE subscription_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscription_events TO marketplace_user;


--
-- TOC entry 5151 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO marketplace_user;


--
-- TOC entry 2145 (class 826 OID 25291)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: marketplace_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE marketplace_user IN SCHEMA public GRANT ALL ON TABLES TO marketplace_user;


--
-- TOC entry 5111 (class 0 OID 16995)
-- Dependencies: 249 5121
-- Name: market_trends_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: marketplace_user
--

REFRESH MATERIALIZED VIEW public.market_trends_mv;


-- Completed on 2025-03-16 08:42:26

--
-- PostgreSQL database dump complete
--

