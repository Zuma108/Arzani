--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

-- Started on 2025-02-09 20:01:54

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
-- TOC entry 298 (class 1255 OID 50521)
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
-- TOC entry 297 (class 1255 OID 50687)
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
-- TOC entry 301 (class 1255 OID 50776)
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
-- TOC entry 302 (class 1255 OID 116716)
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
-- TOC entry 300 (class 1255 OID 50782)
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
-- TOC entry 299 (class 1255 OID 50705)
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
-- TOC entry 296 (class 1255 OID 50421)
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
-- TOC entry 288 (class 1259 OID 50808)
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
-- TOC entry 287 (class 1259 OID 50807)
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
-- TOC entry 5098 (class 0 OID 0)
-- Dependencies: 287
-- Name: business_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_history_id_seq OWNED BY public.business_history.id;


--
-- TOC entry 294 (class 1259 OID 116757)
-- Name: business_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_images (
    id integer NOT NULL,
    business_id integer,
    image_url text NOT NULL
);


ALTER TABLE public.business_images OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 116756)
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
-- TOC entry 5099 (class 0 OID 0)
-- Dependencies: 293
-- Name: business_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_images_id_seq OWNED BY public.business_images.id;


--
-- TOC entry 272 (class 1259 OID 33044)
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
    CONSTRAINT check_images_length CHECK ((array_length(images, 1) <= 5)),
    CONSTRAINT positive_price CHECK ((price >= (0)::numeric)),
    CONSTRAINT valid_ebitda CHECK (((ebitda IS NULL) OR (ebitda >= ('-999999999'::integer)::numeric)))
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 33043)
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
-- TOC entry 5101 (class 0 OID 0)
-- Dependencies: 271
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- TOC entry 275 (class 1259 OID 49445)
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
-- TOC entry 274 (class 1259 OID 49444)
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
-- TOC entry 5104 (class 0 OID 0)
-- Dependencies: 274
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 273 (class 1259 OID 33053)
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
-- TOC entry 295 (class 1259 OID 118199)
-- Name: market_trends_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: marketplace_user
--

CREATE MATERIALIZED VIEW public.market_trends_mv AS
 SELECT date_trunc('day'::text, date_listed) AS date,
    industry,
    location,
    avg(price) AS avg_price,
    count(*) AS listings_count,
    avg(
        CASE
            WHEN ((ebitda <> (0)::numeric) AND (price <> (0)::numeric)) THEN (ebitda / price)
            ELSE NULL::numeric
        END) AS avg_multiple
   FROM public.businesses
  GROUP BY (date_trunc('day'::text, date_listed)), industry, location
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.market_trends_mv OWNER TO marketplace_user;

--
-- TOC entry 284 (class 1259 OID 50555)
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
-- TOC entry 283 (class 1259 OID 50554)
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
-- TOC entry 5107 (class 0 OID 0)
-- Dependencies: 283
-- Name: payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_history_id_seq OWNED BY public.payment_history.id;


--
-- TOC entry 280 (class 1259 OID 50407)
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
-- TOC entry 279 (class 1259 OID 50406)
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
-- TOC entry 5108 (class 0 OID 0)
-- Dependencies: 279
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- TOC entry 290 (class 1259 OID 108374)
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
-- TOC entry 289 (class 1259 OID 108373)
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
-- TOC entry 5109 (class 0 OID 0)
-- Dependencies: 289
-- Name: saved_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_businesses_id_seq OWNED BY public.saved_businesses.id;


--
-- TOC entry 292 (class 1259 OID 108422)
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
-- TOC entry 291 (class 1259 OID 108421)
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
-- TOC entry 5110 (class 0 OID 0)
-- Dependencies: 291
-- Name: scraped_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scraped_data_id_seq OWNED BY public.scraped_data.id;


--
-- TOC entry 286 (class 1259 OID 50574)
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
-- TOC entry 285 (class 1259 OID 50573)
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
-- TOC entry 5111 (class 0 OID 0)
-- Dependencies: 285
-- Name: subscription_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_events_id_seq OWNED BY public.subscription_events.id;


--
-- TOC entry 282 (class 1259 OID 50536)
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
-- TOC entry 281 (class 1259 OID 50535)
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
-- TOC entry 5112 (class 0 OID 0)
-- Dependencies: 281
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- TOC entry 277 (class 1259 OID 50348)
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
    subscription_type character varying(50) DEFAULT 'free'::character varying
);


ALTER TABLE public.users OWNER TO marketplace_user;

--
-- TOC entry 278 (class 1259 OID 50358)
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
-- TOC entry 276 (class 1259 OID 50347)
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
-- TOC entry 5113 (class 0 OID 0)
-- Dependencies: 276
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4840 (class 2604 OID 50811)
-- Name: business_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history ALTER COLUMN id SET DEFAULT nextval('public.business_history_id_seq'::regclass);


--
-- TOC entry 4847 (class 2604 OID 116760)
-- Name: business_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images ALTER COLUMN id SET DEFAULT nextval('public.business_images_id_seq'::regclass);


--
-- TOC entry 4818 (class 2604 OID 33047)
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- TOC entry 4820 (class 2604 OID 49448)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 4836 (class 2604 OID 50558)
-- Name: payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history ALTER COLUMN id SET DEFAULT nextval('public.payment_history_id_seq'::regclass);


--
-- TOC entry 4829 (class 2604 OID 50410)
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- TOC entry 4843 (class 2604 OID 108377)
-- Name: saved_businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses ALTER COLUMN id SET DEFAULT nextval('public.saved_businesses_id_seq'::regclass);


--
-- TOC entry 4845 (class 2604 OID 108425)
-- Name: scraped_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data ALTER COLUMN id SET DEFAULT nextval('public.scraped_data_id_seq'::regclass);


--
-- TOC entry 4838 (class 2604 OID 50577)
-- Name: subscription_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events ALTER COLUMN id SET DEFAULT nextval('public.subscription_events_id_seq'::regclass);


--
-- TOC entry 4832 (class 2604 OID 50539)
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- TOC entry 4822 (class 2604 OID 50351)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5085 (class 0 OID 50808)
-- Dependencies: 288
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
\.


--
-- TOC entry 5091 (class 0 OID 116757)
-- Dependencies: 294
-- Data for Name: business_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_images (id, business_id, image_url) FROM stdin;
\.


--
-- TOC entry 5070 (class 0 OID 33044)
-- Dependencies: 272
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, business_name, industry, price, cash_flow, gross_revenue, ebitda, inventory, sales_multiple, profit_margin, debt_service, cash_on_cash, down_payment, location, ffe, employees, reason_for_selling, description, images, date_listed, years_in_operation, recurring_revenue_percentage, growth_rate, intellectual_property, website_traffic, social_media_followers, user_id) FROM stdin;
1	1546	Agriculture	56	56	51	6	51	1	6	55	5	66	5	5	6	5	5	{{images-1734521048864-980329172.jpg}}	2024-12-18 11:24:08.913743	\N	\N	\N	\N	\N	\N	\N
2	SSA	Agriculture	456465	45654	56546	546	65	56	56	65	65	56	65	54	5	fjdsfsab	fjodfbsdioufdhiofdf	{{images-1734573856681-251882599.jpg}}	2024-12-19 02:04:16.724059	\N	\N	\N	\N	\N	\N	\N
3	SSA	Agriculture	456465	45654	56546	546	65	56	56	65	65	56	65	54	5	fjdsfsab	fjodfbsdioufdhiofdf	{{images-1734573885783-411717603.jpg}}	2024-12-19 02:04:45.828062	\N	\N	\N	\N	\N	\N	\N
4	asdads	Agriculture	56	5	65	5	5	56	65	56	15	6	5	65	56	56	56	{{images-1734579554511-625269627.jpg}}	2024-12-19 03:39:14.558391	\N	\N	\N	\N	\N	\N	\N
5	sds	Agriculture	98	8	88	5	5	6	5	5	546	6	5	56	65	5	6	{{images-1734579608949-904977548.jpg}}	2024-12-19 03:40:08.987991	\N	\N	\N	\N	\N	\N	\N
6	sdjo	Agriculture	54	5656	74	58	65	65	65	5	6	5	32	2	365	56	65	{{images-1734580979249-109411765.jpg}}	2024-12-19 04:02:59.392444	\N	\N	\N	\N	\N	\N	\N
7	645	Agriculture	51	665	165	56	651	6	65	6	5	1	56	65	65	6	56	{{images-1734581860871-315939525.jpg}}	2024-12-19 04:17:40.910398	\N	\N	\N	\N	\N	\N	\N
8	csd	Agriculture	56	456	56	56	58966	65	65	65	26	23	65	56	56	65	dsdlkm	{{images-1734582270697-796840027.jpg}}	2024-12-19 04:24:30.746275	\N	\N	\N	\N	\N	\N	\N
9	dsds	Agriculture	56	654	56	56	65	65	56	561	6651	6165	61	16	5156	15	6	{{images-1734583323281-388768466.jpg}}	2024-12-19 04:42:03.324876	\N	\N	\N	\N	\N	\N	\N
10	dsd	Agriculture	5	5	5	5	65	56	56	56	56	65	5	6	56	56	65	{{images-1734584145410-382457799.jpg}}	2024-12-19 04:55:45.487027	\N	\N	\N	\N	\N	\N	\N
11	\N	Agriculture	2654	54	56	5	56	56	56	65	1	56	56	65	15	61	65	{{images-1734710341626-995593969.jpg}}	2024-12-20 15:59:01.775242	\N	\N	\N	\N	\N	\N	\N
12	\N	Beauty & Personal Care	56516	156	1	51	56	2	1	6	51	6	156	5	56	55	61	{{images-1734710380781-2269971.jpg}}	2024-12-20 15:59:40.833475	\N	\N	\N	\N	\N	\N	\N
13	Coca Cola	Wholesale & Distributors	100000	10	100	100	100	10	100	10	100	10	100	100	1000	Because I'm Retiring 	I felt like it I am the most insane human ever	{{90082cd4dcdbce6cbe521b5b40c73a7e}}	2024-12-31 13:36:48.951708	\N	\N	\N	\N	\N	\N	\N
14	Charlies Chocolates 	Agriculture	12000000	120000	500000	150000	20000	3	25	30000	12	100000	London, UK	50000	15	Retirement, health issues, pursuing new opportunities	This business is a premium chocolate manufacturing company renowned for its artisanal, high-quality products. Operating in a modern facility, it specializes in crafting unique flavors and luxury chocolates using sustainably sourced ingredients. The company has a strong brand presence, supplying to major retailers, boutique shops, and direct-to-consumer channels through its well-established online store. With proprietary recipes, scalable production capabilities, and a loyal customer base, this is an exceptional opportunity for a buyer looking to enter or expand in the lucrative confectionery industry.	{business-1737746570750-53793207.png,business-1737746570758-32958918.png,business-1737746570760-187761928.png}	2025-01-24 19:22:50.773051	8	\N	\N	\N	\N	\N	1
15	Pizza 4 U 	Restaurants & Food	250000	75000	500000	90000	10000	3	18	20000	12	50000	Manchester, UK	40000	12	Owner relocating to another country.\r\n\r\n	This pizza company is a thriving business located in the heart of Manchester, known for its handcrafted pizzas made from fresh, locally sourced ingredients. The menu includes a variety of traditional and signature pizzas, catering to both dine-in and delivery customers. The business has a well-established customer base, with strong online presence and rave reviews across platforms. Featuring a modern dining area, efficient kitchen setup, and delivery partnerships with platforms like Deliveroo and Uber Eats, this business is poised for continued growth. A perfect opportunity for someone looking to own a successful pizzeria with a proven track record.	{business-1737753636404-516978295.jpg,business-1737753636411-25036649.jpg,business-1737753636437-581067930.png}	2025-01-24 21:20:36.450482	5	\N	\N	\N	\N	\N	1
17	Lark Manufacturers	Manufacturing	1500000	50000	300000	65000	25000	2.5	22	15000	12	40000	London, UK	15000	6	Owner pursuing new business opportunities.	This clothing company is a boutique fashion brand based in London, specializing in sustainable, trend-forward apparel for men and women. The brand is well-known for its high-quality, eco-friendly materials and exclusive designs. The company has a loyal customer base and operates both in-store and online, with an efficient e-commerce platform and excellent delivery logistics. Its curated social media presence drives strong engagement, while its subscription model for seasonal collections ensures recurring revenue. The company is fully equipped with modern point-of-sale systems, stylish fixtures, and inventory ready for continued operations. This is an excellent opportunity to acquire a well-established, growing fashion brand.	{business-1737964230915-364938365.jpg,business-1737964230922-889788037.jpg,business-1737964230923-133261277.png}	2025-01-27 07:50:30.933561	7	\N	\N	\N	\N	\N	1
\.


--
-- TOC entry 5072 (class 0 OID 49445)
-- Dependencies: 275
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, business_id, first_name, last_name, phone, email, timeframe, message, newsletter, created_at) FROM stdin;
\.


--
-- TOC entry 5081 (class 0 OID 50555)
-- Dependencies: 284
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_history (id, user_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, created_at) FROM stdin;
\.


--
-- TOC entry 5077 (class 0 OID 50407)
-- Dependencies: 280
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, price, description, stripe_product_id, stripe_price_id, created_at, updated_at) FROM stdin;
1	gold	39.00	Gold Plan with verified ID and ScoutSights	prod_RWAM5xjyVPSxGJ	price_xxx	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
2	platinum	50.00	Platinum Plan with all features including Off Market Leads	prod_RWAVR2LGingUrm	price_yyy	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
\.


--
-- TOC entry 5087 (class 0 OID 108374)
-- Dependencies: 290
-- Data for Name: saved_businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_businesses (id, user_id, business_id, saved_at) FROM stdin;
20	1	17	2025-02-06 14:33:10.991371+00
21	1	9	2025-02-09 18:54:28.52112+00
23	1	15	2025-02-09 20:00:14.660629+00
\.


--
-- TOC entry 5089 (class 0 OID 108422)
-- Dependencies: 292
-- Data for Name: scraped_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraped_data (id, source_url, business_name, industry, price, revenue, ebitda, location, employees, valuation, scraped_at, net_profit, price_text, price_min, price_max) FROM stdin;
\.


--
-- TOC entry 5083 (class 0 OID 50574)
-- Dependencies: 286
-- Data for Name: subscription_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_events (id, user_id, event_type, plan_type, stripe_event_id, created_at) FROM stdin;
\.


--
-- TOC entry 5079 (class 0 OID 50536)
-- Dependencies: 282
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, stripe_subscription_id, plan_type, status, current_period_start, current_period_end, cancelled_at, created_at, updated_at, subscription_status, subscription_end_date, trial_end_date) FROM stdin;
\.


--
-- TOC entry 5074 (class 0 OID 50348)
-- Dependencies: 277
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users (id, username, email, created_at, google_id, microsoft_id, linkedin_id, auth_provider, updated_at, profile_picture, stripe_customer_id, api_calls_count, subscription_end, subscription_type) FROM stdin;
2	ZumaTornado1	zumaadekoya@gmail.com	2024-12-31 16:15:09.305415	\N	\N	\N	email	2025-01-07 23:29:47.507655	\N	\N	0	\N	free
1	ZumaTornado1	michaaldekoya@gmail.com	2024-12-31 08:47:47.558134	\N	\N	\N	email	2025-01-09 01:09:04.665839	/uploads/profiles/profile-1736384944604-797407904.png	\N	0	\N	free
\.


--
-- TOC entry 5075 (class 0 OID 50358)
-- Dependencies: 278
-- Data for Name: users_auth; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users_auth (user_id, password_hash, verified, verification_token, verification_expires) FROM stdin;
1	$2b$10$W6mEBMR260jQtrIegGeQM.JQ0FJJT5E9tj06ZAaWRds0b5w72GxZ2	t	\N	\N
2	$2b$10$VbZChMxme0i6qQ7gOBtESe47uOzNHRer/5lvAM1kDbn8NF5QwAm7u	t	\N	\N
\.


--
-- TOC entry 5114 (class 0 OID 0)
-- Dependencies: 287
-- Name: business_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_history_id_seq', 78, true);


--
-- TOC entry 5115 (class 0 OID 0)
-- Dependencies: 293
-- Name: business_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_images_id_seq', 1, false);


--
-- TOC entry 5116 (class 0 OID 0)
-- Dependencies: 271
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.businesses_id_seq', 17, true);


--
-- TOC entry 5117 (class 0 OID 0)
-- Dependencies: 274
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- TOC entry 5118 (class 0 OID 0)
-- Dependencies: 283
-- Name: payment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_history_id_seq', 1, false);


--
-- TOC entry 5119 (class 0 OID 0)
-- Dependencies: 279
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 2, true);


--
-- TOC entry 5120 (class 0 OID 0)
-- Dependencies: 289
-- Name: saved_businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_businesses_id_seq', 23, true);


--
-- TOC entry 5121 (class 0 OID 0)
-- Dependencies: 291
-- Name: scraped_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scraped_data_id_seq', 1, false);


--
-- TOC entry 5122 (class 0 OID 0)
-- Dependencies: 285
-- Name: subscription_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_events_id_seq', 1, false);


--
-- TOC entry 5123 (class 0 OID 0)
-- Dependencies: 281
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- TOC entry 5124 (class 0 OID 0)
-- Dependencies: 276
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- TOC entry 4890 (class 2606 OID 50817)
-- Name: business_history business_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4906 (class 2606 OID 116764)
-- Name: business_images business_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4853 (class 2606 OID 33052)
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4858 (class 2606 OID 49453)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4884 (class 2606 OID 50561)
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4886 (class 2606 OID 50563)
-- Name: payment_history payment_history_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- TOC entry 4875 (class 2606 OID 50414)
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- TOC entry 4900 (class 2606 OID 108380)
-- Name: saved_businesses saved_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4902 (class 2606 OID 108382)
-- Name: saved_businesses saved_businesses_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 4904 (class 2606 OID 108430)
-- Name: scraped_data scraped_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data
    ADD CONSTRAINT scraped_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4888 (class 2606 OID 50580)
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4879 (class 2606 OID 50543)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 50545)
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- TOC entry 4896 (class 2606 OID 50819)
-- Name: business_history unique_recent_view; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT unique_recent_view UNIQUE (user_id, business_id, viewed_at);


--
-- TOC entry 4873 (class 2606 OID 50365)
-- Name: users_auth users_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4866 (class 2606 OID 50356)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4868 (class 2606 OID 50354)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 50552)
-- Name: users users_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- TOC entry 4891 (class 1259 OID 50831)
-- Name: idx_business_history_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_business ON public.business_history USING btree (business_id);


--
-- TOC entry 4892 (class 1259 OID 50830)
-- Name: idx_business_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user ON public.business_history USING btree (user_id);


--
-- TOC entry 4893 (class 1259 OID 116754)
-- Name: idx_business_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user_id ON public.business_history USING btree (user_id);


--
-- TOC entry 4894 (class 1259 OID 50833)
-- Name: idx_business_history_viewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_viewed_at ON public.business_history USING btree (viewed_at);


--
-- TOC entry 4859 (class 1259 OID 116755)
-- Name: idx_contacts_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_business_id ON public.contacts USING btree (business_id);


--
-- TOC entry 4854 (class 1259 OID 116792)
-- Name: idx_date_listed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_date_listed ON public.businesses USING btree (date_listed);


--
-- TOC entry 4855 (class 1259 OID 116793)
-- Name: idx_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_industry ON public.businesses USING btree (industry);


--
-- TOC entry 4856 (class 1259 OID 116794)
-- Name: idx_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location ON public.businesses USING btree (location);


--
-- TOC entry 4907 (class 1259 OID 118212)
-- Name: idx_market_trends_mv_date; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_market_trends_mv_date ON public.market_trends_mv USING btree (date);


--
-- TOC entry 4908 (class 1259 OID 118211)
-- Name: idx_market_trends_mv_unique; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE UNIQUE INDEX idx_market_trends_mv_unique ON public.market_trends_mv USING btree (date, industry, location);


--
-- TOC entry 4882 (class 1259 OID 50571)
-- Name: idx_payment_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_user_id ON public.payment_history USING btree (user_id);


--
-- TOC entry 4897 (class 1259 OID 108394)
-- Name: idx_saved_businesses_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_business ON public.saved_businesses USING btree (business_id);


--
-- TOC entry 4898 (class 1259 OID 108393)
-- Name: idx_saved_businesses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_user ON public.saved_businesses USING btree (user_id);


--
-- TOC entry 4876 (class 1259 OID 50570)
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- TOC entry 4877 (class 1259 OID 50569)
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- TOC entry 4860 (class 1259 OID 50519)
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider);


--
-- TOC entry 4871 (class 1259 OID 50371)
-- Name: idx_users_auth_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_user_id ON public.users_auth USING btree (user_id);


--
-- TOC entry 4861 (class 1259 OID 50357)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4862 (class 1259 OID 50517)
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- TOC entry 4863 (class 1259 OID 50516)
-- Name: idx_users_linkedin_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_linkedin_id ON public.users USING btree (linkedin_id);


--
-- TOC entry 4864 (class 1259 OID 50518)
-- Name: idx_users_microsoft_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_microsoft_id ON public.users USING btree (microsoft_id);


--
-- TOC entry 4920 (class 2620 OID 116751)
-- Name: businesses refresh_market_trends; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_market_trends AFTER INSERT OR DELETE OR UPDATE ON public.businesses FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_market_trends_mv();


--
-- TOC entry 4921 (class 2620 OID 118227)
-- Name: users set_default_profile_picture; Type: TRIGGER; Schema: public; Owner: marketplace_user
--

CREATE TRIGGER set_default_profile_picture BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.assign_random_profile_picture();


--
-- TOC entry 4915 (class 2606 OID 50825)
-- Name: business_history business_history_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4916 (class 2606 OID 50820)
-- Name: business_history business_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4919 (class 2606 OID 116765)
-- Name: business_images business_images_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4909 (class 2606 OID 75632)
-- Name: businesses businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4910 (class 2606 OID 49454)
-- Name: contacts contacts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- TOC entry 4913 (class 2606 OID 50564)
-- Name: payment_history payment_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4917 (class 2606 OID 108388)
-- Name: saved_businesses saved_businesses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 4918 (class 2606 OID 108383)
-- Name: saved_businesses saved_businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4914 (class 2606 OID 50581)
-- Name: subscription_events subscription_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4912 (class 2606 OID 50546)
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4911 (class 2606 OID 50366)
-- Name: users_auth users_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5100 (class 0 OID 0)
-- Dependencies: 272
-- Name: TABLE businesses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.businesses TO marketplace_user;


--
-- TOC entry 5102 (class 0 OID 0)
-- Dependencies: 271
-- Name: SEQUENCE businesses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.businesses_id_seq TO marketplace_user;


--
-- TOC entry 5103 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contacts TO marketplace_user;


--
-- TOC entry 5105 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.contacts_id_seq TO marketplace_user;


--
-- TOC entry 5106 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE industry_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.industry_metrics TO marketplace_user;


--
-- TOC entry 5092 (class 0 OID 118199)
-- Dependencies: 295 5094
-- Name: market_trends_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: marketplace_user
--

REFRESH MATERIALIZED VIEW public.market_trends_mv;


-- Completed on 2025-02-09 20:01:55

--
-- PostgreSQL database dump complete
--

