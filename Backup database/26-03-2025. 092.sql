--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-03-26 09:22:28

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
-- TOC entry 281 (class 1255 OID 16688)
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
-- TOC entry 272 (class 1255 OID 16689)
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
-- TOC entry 273 (class 1255 OID 16690)
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
-- TOC entry 274 (class 1255 OID 16691)
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
-- TOC entry 275 (class 1255 OID 16692)
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
-- TOC entry 276 (class 1255 OID 16693)
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
-- TOC entry 277 (class 1255 OID 16694)
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
-- TOC entry 279 (class 1255 OID 27050)
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_conversation_timestamp() OWNER TO postgres;

--
-- TOC entry 278 (class 1255 OID 16695)
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

--
-- TOC entry 280 (class 1255 OID 27118)
-- Name: update_user_last_active(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_last_active() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Determine which table triggered this function and use appropriate column
    IF TG_TABLE_NAME = 'conversation_participants' THEN
        UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'messages' THEN
        UPDATE users SET last_active = NOW() WHERE id = NEW.sender_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_last_active() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 254 (class 1259 OID 25326)
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
-- TOC entry 253 (class 1259 OID 25325)
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
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 253
-- Name: ai_credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.ai_credits_id_seq OWNED BY public.ai_credits.id;


--
-- TOC entry 256 (class 1259 OID 25357)
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
-- TOC entry 255 (class 1259 OID 25356)
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
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 255
-- Name: assistant_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.assistant_interactions_id_seq OWNED BY public.assistant_interactions.id;


--
-- TOC entry 258 (class 1259 OID 25374)
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
-- TOC entry 257 (class 1259 OID 25373)
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
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 257
-- Name: assistant_prompts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.assistant_prompts_id_seq OWNED BY public.assistant_prompts.id;


--
-- TOC entry 225 (class 1259 OID 16696)
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
-- TOC entry 226 (class 1259 OID 16703)
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
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 226
-- Name: business_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_history_id_seq OWNED BY public.business_history.id;


--
-- TOC entry 227 (class 1259 OID 16704)
-- Name: business_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_images (
    id integer NOT NULL,
    business_id integer,
    image_url text NOT NULL
);


ALTER TABLE public.business_images OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16709)
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
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 228
-- Name: business_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_images_id_seq OWNED BY public.business_images.id;


--
-- TOC entry 271 (class 1259 OID 27251)
-- Name: business_inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_inquiries (
    id integer NOT NULL,
    business_id integer,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    email character varying(255) NOT NULL,
    timeframe character varying(100),
    message text,
    newsletter boolean DEFAULT false,
    user_email character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying,
    conversation_id integer
);


ALTER TABLE public.business_inquiries OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 27250)
-- Name: business_inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_inquiries_id_seq OWNER TO postgres;

--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 270
-- Name: business_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_inquiries_id_seq OWNED BY public.business_inquiries.id;


--
-- TOC entry 229 (class 1259 OID 16710)
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
-- TOC entry 230 (class 1259 OID 16720)
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
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 230
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- TOC entry 269 (class 1259 OID 27201)
-- Name: contact_forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_forms (
    id integer NOT NULL,
    user_id integer NOT NULL,
    business_id integer,
    seller_id integer,
    interest_level character varying(50),
    purchase_timeline character varying(50),
    message text,
    questions text,
    contact_consent boolean DEFAULT false,
    conversation_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying
);


ALTER TABLE public.contact_forms OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 27200)
-- Name: contact_forms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_forms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_forms_id_seq OWNER TO postgres;

--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 268
-- Name: contact_forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_forms_id_seq OWNED BY public.contact_forms.id;


--
-- TOC entry 231 (class 1259 OID 16721)
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
-- TOC entry 232 (class 1259 OID 16727)
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
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 232
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 262 (class 1259 OID 26970)
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    conversation_id integer NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL,
    last_read_at timestamp without time zone,
    is_admin boolean DEFAULT false
);


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 26955)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_group_chat boolean DEFAULT false,
    is_ai_chat boolean DEFAULT false,
    business_id integer,
    group_name character varying(255)
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 26954)
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 260
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- TOC entry 233 (class 1259 OID 16728)
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
-- TOC entry 234 (class 1259 OID 16734)
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
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 234
-- Name: document_exports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.document_exports_id_seq OWNED BY public.document_exports.id;


--
-- TOC entry 235 (class 1259 OID 16735)
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
-- TOC entry 259 (class 1259 OID 26231)
-- Name: market_trends_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: marketplace_user
--

CREATE MATERIALIZED VIEW public.market_trends_mv AS
 WITH daily_metrics AS (
         SELECT date_trunc('day'::text, businesses.date_listed) AS date,
            businesses.industry,
            businesses.location,
            avg(businesses.price) AS avg_price,
            count(*) AS listings_count,
            avg(
                CASE
                    WHEN (businesses.gross_revenue > (0)::numeric) THEN (businesses.price / businesses.gross_revenue)
                    ELSE NULL::numeric
                END) AS avg_multiple
           FROM public.businesses
          WHERE (businesses.date_listed IS NOT NULL)
          GROUP BY (date_trunc('day'::text, businesses.date_listed)), businesses.industry, businesses.location
        )
 SELECT date,
    industry,
    location,
    avg_price,
    listings_count,
    avg_multiple
   FROM daily_metrics
  ORDER BY date DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.market_trends_mv OWNER TO marketplace_user;

--
-- TOC entry 267 (class 1259 OID 27031)
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_attachments (
    id integer NOT NULL,
    message_id integer,
    file_path character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_attachments OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 27030)
-- Name: message_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 266
-- Name: message_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_attachments_id_seq OWNED BY public.message_attachments.id;


--
-- TOC entry 265 (class 1259 OID 27014)
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    message_id integer NOT NULL,
    user_id integer NOT NULL,
    reaction character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 26988)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer,
    sender_id integer,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false,
    is_system_message boolean DEFAULT false,
    parent_message_id integer
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 26987)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 263
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 236 (class 1259 OID 16746)
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
-- TOC entry 237 (class 1259 OID 16750)
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
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 237
-- Name: payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_history_id_seq OWNED BY public.payment_history.id;


--
-- TOC entry 238 (class 1259 OID 16751)
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
-- TOC entry 239 (class 1259 OID 16759)
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
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 239
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- TOC entry 240 (class 1259 OID 16760)
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
-- TOC entry 241 (class 1259 OID 16764)
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
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 241
-- Name: saved_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_businesses_id_seq OWNED BY public.saved_businesses.id;


--
-- TOC entry 242 (class 1259 OID 16765)
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
-- TOC entry 243 (class 1259 OID 16771)
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
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 243
-- Name: scraped_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scraped_data_id_seq OWNED BY public.scraped_data.id;


--
-- TOC entry 244 (class 1259 OID 16772)
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
-- TOC entry 245 (class 1259 OID 16776)
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
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 245
-- Name: subscription_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_events_id_seq OWNED BY public.subscription_events.id;


--
-- TOC entry 246 (class 1259 OID 16777)
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
-- TOC entry 247 (class 1259 OID 16783)
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
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 247
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- TOC entry 252 (class 1259 OID 17032)
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
-- TOC entry 251 (class 1259 OID 17031)
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
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 251
-- Name: upload_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.upload_requests_id_seq OWNED BY public.upload_requests.id;


--
-- TOC entry 248 (class 1259 OID 16784)
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
    last_login timestamp without time zone,
    role character varying(50) DEFAULT 'user'::character varying,
    last_active timestamp without time zone,
    CONSTRAINT profile_picture_s3_url CHECK (((s3_profile_picture IS NULL) OR (s3_profile_picture ~~ 'https://%s3.eu-north-1.amazonaws.com%'::text)))
);


ALTER TABLE public.users OWNER TO marketplace_user;

--
-- TOC entry 249 (class 1259 OID 16795)
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
-- TOC entry 250 (class 1259 OID 16801)
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
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 250
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: marketplace_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4871 (class 2604 OID 25329)
-- Name: ai_credits id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits ALTER COLUMN id SET DEFAULT nextval('public.ai_credits_id_seq'::regclass);


--
-- TOC entry 4879 (class 2604 OID 25360)
-- Name: assistant_interactions id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions ALTER COLUMN id SET DEFAULT nextval('public.assistant_interactions_id_seq'::regclass);


--
-- TOC entry 4882 (class 2604 OID 25377)
-- Name: assistant_prompts id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_prompts ALTER COLUMN id SET DEFAULT nextval('public.assistant_prompts_id_seq'::regclass);


--
-- TOC entry 4834 (class 2604 OID 16945)
-- Name: business_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history ALTER COLUMN id SET DEFAULT nextval('public.business_history_id_seq'::regclass);


--
-- TOC entry 4837 (class 2604 OID 16946)
-- Name: business_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images ALTER COLUMN id SET DEFAULT nextval('public.business_images_id_seq'::regclass);


--
-- TOC entry 4902 (class 2604 OID 27254)
-- Name: business_inquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_inquiries ALTER COLUMN id SET DEFAULT nextval('public.business_inquiries_id_seq'::regclass);


--
-- TOC entry 4838 (class 2604 OID 16947)
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- TOC entry 4898 (class 2604 OID 27204)
-- Name: contact_forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms ALTER COLUMN id SET DEFAULT nextval('public.contact_forms_id_seq'::regclass);


--
-- TOC entry 4841 (class 2604 OID 16948)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 4884 (class 2604 OID 26958)
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- TOC entry 4843 (class 2604 OID 16949)
-- Name: document_exports id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports ALTER COLUMN id SET DEFAULT nextval('public.document_exports_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 27034)
-- Name: message_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments ALTER COLUMN id SET DEFAULT nextval('public.message_attachments_id_seq'::regclass);


--
-- TOC entry 4891 (class 2604 OID 26991)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 4845 (class 2604 OID 16950)
-- Name: payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history ALTER COLUMN id SET DEFAULT nextval('public.payment_history_id_seq'::regclass);


--
-- TOC entry 4847 (class 2604 OID 16951)
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- TOC entry 4850 (class 2604 OID 16952)
-- Name: saved_businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses ALTER COLUMN id SET DEFAULT nextval('public.saved_businesses_id_seq'::regclass);


--
-- TOC entry 4852 (class 2604 OID 16953)
-- Name: scraped_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data ALTER COLUMN id SET DEFAULT nextval('public.scraped_data_id_seq'::regclass);


--
-- TOC entry 4854 (class 2604 OID 16954)
-- Name: subscription_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events ALTER COLUMN id SET DEFAULT nextval('public.subscription_events_id_seq'::regclass);


--
-- TOC entry 4856 (class 2604 OID 16955)
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- TOC entry 4868 (class 2604 OID 17035)
-- Name: upload_requests id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests ALTER COLUMN id SET DEFAULT nextval('public.upload_requests_id_seq'::regclass);


--
-- TOC entry 4860 (class 2604 OID 16956)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5220 (class 0 OID 25326)
-- Dependencies: 254
-- Data for Name: ai_credits; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.ai_credits (id, user_id, credits_used, credits_limit, last_reset, next_reset, subscription_tier, created_at, updated_at) FROM stdin;
1	1	18	30	2025-03-15 17:24:53.552	2025-03-22 17:24:53.552	free	2025-03-15 17:24:53.552738	2025-03-22 15:19:51.762065
4	2	0	30	2025-03-26 00:49:27.167	2025-04-02 01:49:27.167	free	2025-03-26 00:49:27.171355	2025-03-26 00:49:27.171355
5	6	0	30	2025-03-26 08:38:03.401	2025-04-02 09:38:03.401	free	2025-03-26 08:38:03.405939	2025-03-26 08:38:03.405939
\.


--
-- TOC entry 5222 (class 0 OID 25357)
-- Dependencies: 256
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
13	1	Help me find a business to buy	Certainly! To assist you better, could you please specify your preferences? You can narrow down the options by providing criteria such as:\n\n- **Location**: Are you interested in a specific city or region in the UK?\n- **Industry**: Do you have a particular industry in mind, such as technology, food, or education?\n- **Price Range**: What is your budget for purchasing a business?\n\nOnce I have this information, I can provide a list of businesses that match your criteria.	738	2025-03-18 09:06:17.683252	{"listingsCount": 19, "suggestionsCount": 3}	\N
14	1	What makes a good business investment?	A good business investment typically hinges on several key factors:\n\n1. **Strong Financials**: Look for businesses with solid financial performance. This includes consistent revenue and profit growth, manageable debt levels, and positive cash flow. Reviewing financial statements will help you assess the business's economic health and potential for future profitability.\n\n2. **Market Position and Growth Potential**: A desirable business should have a strong position in its market, ideally with a competitive advantage that differentiates it from others. Additionally, consider the industry’s growth potential. Businesses in expanding markets or emerging industries often offer greater opportunities for long-term success.\n\n3. **Management Team and Operations**: A competent and experienced management team can significantly influence a business's success. Evaluate their track record, decision-making processes, and how well they have navigated past challenges. Efficient operations and a clear strategic vision are also vital components of a well-run business.\n\nUltimately, a good investment should align with your financial goals, risk tolerance, and personal interests. Conduct thorough due diligence to ensure you're making an informed decision.	964	2025-03-18 09:08:11.874673	{"listingsCount": 19, "suggestionsCount": 3}	\N
15	1	I have a budget of 13,000,000 is LuxeJet Travels a right business to buy for me	LuxeJet Travel Services is listed at £12,000,000, which fits within your budget of £13,000,000. However, whether it is the right business for you depends on several factors beyond just the purchase price. Here are a few considerations:\n\n1. **Industry and Market Potential**: LuxeJet operates in the travel industry, which can be lucrative but is also susceptible to economic fluctuations and global events. Consider if you are comfortable with these risks and if you believe there is growth potential in this sector.\n\n2. **Business Performance**: Review LuxeJet’s financials, including revenue, profit margins, and cash flow. Understanding the company's financial health is crucial to assess its sustainability and growth prospects.\n\n3. **Personal Interest and Expertise**: Owning a business can be demanding. Ensure that you have a genuine interest in the travel industry and the necessary expertise or willingness to acquire it to effectively manage and grow the business.\n\nConducting thorough due diligence and possibly consulting with a financial advisor or business consultant could provide deeper insights into whether LuxeJet is a suitable investment for you.	1229	2025-03-18 09:08:56.850299	{"listingsCount": 19, "suggestionsCount": 3}	\N
16	1	Help me find a business to buy	Certainly! To assist you better, could you please provide more details on what you're looking for? Here are a few criteria to consider:\n\n1. **Industry Preference**: Are you interested in a specific industry, such as Technology, Education, or Food?\n2. **Location**: Do you have a preferred location within the UK, like London or Manchester?\n3. **Price Range**: What is your budget for purchasing a business?\n\nWith this information, I can provide you with a list of businesses that match your criteria.	744	2025-03-22 11:41:35.854162	{"listingsCount": 19, "suggestionsCount": 3}	\N
17	1	Help me find a business to buy	Certainly! To assist you better, could you please provide more details on what you're looking for? Consider specifying:\n\n1. **Location**: Are you interested in a specific area or city within the UK?\n2. **Industry**: Do you have a particular industry in mind, such as technology, food, or education?\n3. **Price Range**: What is your budget for purchasing a business?\n\nWith more information, I can suggest listings that best match your criteria.	733	2025-03-22 11:53:34.390073	{"listingsCount": 19, "suggestionsCount": 3}	\N
18	1	hey	Hello! How can I assist you today with buying or selling a business on Arzani?	645	2025-03-22 15:19:51.743198	{"listingsCount": 19, "suggestionsCount": 3}	\N
\.


--
-- TOC entry 5224 (class 0 OID 25374)
-- Dependencies: 258
-- Data for Name: assistant_prompts; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.assistant_prompts (id, title, prompt_text, category, created_at) FROM stdin;
1	Find Business	Show me businesses in {location}	search	2025-03-15 21:20:06.048714
2	Valuation	What is a fair price for a {industry} business?	valuation	2025-03-15 21:20:06.048714
3	Selling Tips	How can I increase the value of my business?	selling	2025-03-15 21:20:06.048714
4	Find Business	Show me businesses in {location}	search	2025-03-21 00:55:19.190837
5	Valuation	What is a fair price for a {industry} business?	valuation	2025-03-21 00:55:19.190837
6	Selling Tips	How can I increase the value of my business?	selling	2025-03-21 00:55:19.190837
\.


--
-- TOC entry 5192 (class 0 OID 16696)
-- Dependencies: 225
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
116	1	23	view_details	2025-03-16 13:06:23.588707	{}
117	1	19	contact_seller	2025-03-18 09:04:19.134832	{}
118	1	19	view_details	2025-03-18 09:04:21.679721	{}
119	1	23	contact_seller	2025-03-19 21:23:54.937541	{}
120	1	23	contact_seller	2025-03-19 21:24:36.47651	{}
121	1	23	view_details	2025-03-21 19:19:17.388148	{}
122	1	23	view_details	2025-03-23 09:11:29.003646	{}
123	1	23	view_details	2025-03-23 11:01:16.446454	{}
124	1	23	contact_seller	2025-03-23 11:53:16.398199	{}
125	1	23	contact_seller	2025-03-23 12:12:47.313186	{}
126	1	23	contact_seller	2025-03-23 12:15:34.295574	{}
127	1	23	contact_seller	2025-03-23 12:15:50.105003	{}
128	1	23	contact_seller	2025-03-23 12:23:05.217098	{}
129	1	23	contact_seller	2025-03-23 12:29:42.430273	{}
130	1	23	contact_seller	2025-03-23 12:29:57.545126	{}
131	1	23	contact_seller	2025-03-23 12:30:07.141305	{}
132	1	23	contact_seller	2025-03-23 12:33:11.636737	{}
133	1	23	contact_seller	2025-03-23 12:58:59.911285	{}
134	1	23	contact_seller	2025-03-23 13:11:16.595319	{}
135	1	23	contact_seller	2025-03-23 13:24:50.75492	{}
136	1	23	contact_seller	2025-03-23 13:34:58.235665	{}
137	1	23	contact_seller	2025-03-23 13:37:30.932674	{}
138	1	23	contact_seller	2025-03-23 13:37:40.619726	{}
139	1	23	contact_seller	2025-03-23 14:39:02.111015	{}
140	1	23	contact_seller	2025-03-23 18:14:20.80411	{}
141	1	23	contact_seller	2025-03-23 18:21:07.536958	{}
142	1	23	contact_seller	2025-03-23 18:27:40.23323	{}
143	1	23	contact_seller	2025-03-23 19:25:53.060128	{}
144	1	19	contact_seller	2025-03-23 19:32:26.614487	{}
145	1	19	contact_seller	2025-03-23 20:42:06.374268	{}
146	1	15	view_details	2025-03-23 20:42:54.360134	{}
147	1	15	contact_seller	2025-03-23 20:42:58.627333	{}
148	1	23	contact_seller	2025-03-23 22:17:57.58842	{}
149	1	23	contact_seller	2025-03-23 22:18:05.755434	{}
150	1	23	contact_seller	2025-03-23 22:40:11.252836	{}
151	1	23	contact_seller	2025-03-23 23:14:39.150304	{}
152	1	23	contact_seller	2025-03-23 23:19:02.021692	{}
153	1	23	contact_seller	2025-03-24 13:59:05.422127	{}
154	1	23	contact_seller	2025-03-24 14:25:05.42904	{}
155	1	19	contact_seller	2025-03-24 14:32:10.248315	{}
156	1	23	contact_seller	2025-03-24 14:57:34.101488	{}
157	1	23	contact_seller	2025-03-24 14:57:39.894354	{}
158	1	23	contact_seller	2025-03-24 15:07:30.422194	{}
159	1	23	contact_seller	2025-03-24 15:43:26.777378	{}
160	1	23	contact_seller	2025-03-24 15:54:17.63636	{}
161	1	23	contact_seller	2025-03-24 16:14:14.512487	{}
162	1	23	contact_seller	2025-03-24 19:19:23.064271	{}
163	1	23	view_details	2025-03-25 17:34:33.504753	{}
164	1	23	contact_seller	2025-03-25 17:35:06.24038	{}
165	1	23	contact_seller	2025-03-25 19:08:48.895969	{}
166	1	23	contact_seller	2025-03-25 19:08:59.651496	{}
167	1	23	contact_seller	2025-03-25 19:10:49.814958	{}
168	1	23	contact_seller	2025-03-25 19:10:53.38746	{}
169	1	23	contact_seller	2025-03-25 19:11:31.538337	{}
170	2	18	contact_seller	2025-03-26 00:49:31.389332	{}
171	1	18	view_details	2025-03-26 01:01:01.210134	{}
172	1	18	contact_seller	2025-03-26 01:01:05.126592	{}
173	6	23	contact_seller	2025-03-26 08:39:33.979543	{}
174	6	14	contact_seller	2025-03-26 08:39:42.038907	{}
\.


--
-- TOC entry 5194 (class 0 OID 16704)
-- Dependencies: 227
-- Data for Name: business_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_images (id, business_id, image_url) FROM stdin;
\.


--
-- TOC entry 5237 (class 0 OID 27251)
-- Dependencies: 271
-- Data for Name: business_inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_inquiries (id, business_id, first_name, last_name, phone, email, timeframe, message, newsletter, user_email, created_at, status, conversation_id) FROM stdin;
1	23	Michael	Adekoya	075085 94588	michaaldekoya@gmail.com	0-3	Hello	f	michaaldekoya@gmail.com	2025-03-23 18:27:57.3312	new	\N
4	23	Michael	Adekoya	075085 94588	michaaldekoya@gmail.com	3-6	addsafsfasfdadsfsafbdf	f	michaaldekoya@gmail.com	2025-03-23 23:19:21.852038	new	3
5	23	Michael	Adekoya	075085 94588	collinsokoro49@gmail.com	3-6	Hello	f	michaaldekoya@gmail.com	2025-03-24 14:58:55.356179	new	4
6	23	Michael	Adekoya	075085 94588	michaaldekoya@gmail.com	0-3	hey	f	michaaldekoya@gmail.com	2025-03-24 15:54:34.327674	new	5
7	23	Ireoluwatomiwa	Adekoya	 07883587179	michaaldekoya@gmail.com	3-6	Hello	f	michaaldekoya@gmail.com	2025-03-24 19:19:35.247024	new	6
8	23	Ireoluwatomiwa	Adekoya	075085 94588	michaaldekoya@gmail.com	0-3	hey	f	michaaldekoya@gmail.com	2025-03-25 17:35:19.31641	new	7
9	23	Ireoluwatomiwa	Adekoya	075085 94588	michaaldekoya@gmail.com	0-3	hello	f	michaaldekoya@gmail.com	2025-03-25 19:11:48.277749	new	8
10	18	Michael	Adekoya	07508594588	michaaldekoya@gmail.com	0-3	hey	f	michaaldekoya@gmail.com	2025-03-26 00:50:06.147235	new	9
11	18	Michael	Adekoya	075085 94588	zumaadekoya@gmail.com	0-3	Hey I wanna speak to you	f	michaaldekoya@gmail.com	2025-03-26 01:01:34.420666	new	10
12	14	Comfort	Amore	07508594588	notzuma1234@gmail.com	0-3	Hi I am interested to buy your business	f	michaaldekoya@gmail.com	2025-03-26 08:40:12.867236	new	11
\.


--
-- TOC entry 5196 (class 0 OID 16710)
-- Dependencies: 229
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
-- TOC entry 5235 (class 0 OID 27201)
-- Dependencies: 269
-- Data for Name: contact_forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_forms (id, user_id, business_id, seller_id, interest_level, purchase_timeline, message, questions, contact_consent, conversation_id, created_at, status) FROM stdin;
\.


--
-- TOC entry 5198 (class 0 OID 16721)
-- Dependencies: 231
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, business_id, first_name, last_name, phone, email, timeframe, message, newsletter, created_at) FROM stdin;
1	19	Michael	Adekoya	075085 94588	michaaldekoya@gmail.com	0-3	Hello	f	2025-03-23 19:32:45.309328
2	19	Michael	Adekoya	075085 94588	michaaldekoya@gmail.com	6+	Heyy	f	2025-03-23 20:42:25.268766
3	15	Comfort	Amore	 07883587179	Amorecleaningservices@hotmail.com	0-3	Hello I am looking to buy your cleaning business. \n\n\nFrom - Your loveliest son Tomiwa	t	2025-03-23 20:43:51.641951
4	23	Eliza	Dunn	075085 94588	elizadunn2005@gmail.com	0-3	Hey babe	t	2025-03-23 22:18:28.902419
\.


--
-- TOC entry 5228 (class 0 OID 26970)
-- Dependencies: 262
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (conversation_id, user_id, joined_at, last_read_at, is_admin) FROM stdin;
3	1	2025-03-23 23:19:21.852038	\N	t
4	5	2025-03-24 14:58:55.356179	\N	f
5	1	2025-03-24 15:54:34.327674	2025-03-26 00:48:13.585113	t
4	1	2025-03-24 14:58:55.356179	2025-03-25 22:49:01.670734	t
10	2	2025-03-26 01:01:34.420666	\N	f
8	1	2025-03-25 19:11:48.277749	2025-03-26 08:16:52.498046	t
6	1	2025-03-24 19:19:35.247024	2025-03-26 08:16:53.899056	t
7	1	2025-03-25 17:35:19.31641	2025-03-26 08:16:55.308437	t
9	1	2025-03-26 00:50:06.147235	2025-03-26 08:30:26.427426	t
10	1	2025-03-26 01:01:34.420666	2025-03-26 08:30:28.257601	t
11	1	2025-03-26 08:40:12.867236	\N	t
11	6	2025-03-26 08:40:12.867236	2025-03-26 09:09:22.309662	f
\.


--
-- TOC entry 5227 (class 0 OID 26955)
-- Dependencies: 261
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, created_at, updated_at, is_group_chat, is_ai_chat, business_id, group_name) FROM stdin;
3	2025-03-23 23:19:21.852038	2025-03-23 23:19:21.852038	f	f	23	\N
4	2025-03-24 14:58:55.356179	2025-03-24 14:58:55.356179	f	f	23	\N
5	2025-03-24 15:54:34.327674	2025-03-24 15:54:34.327674	f	f	23	\N
6	2025-03-24 19:19:35.247024	2025-03-24 19:19:35.247024	f	f	23	\N
7	2025-03-25 17:35:19.31641	2025-03-25 17:35:19.31641	f	f	23	\N
8	2025-03-25 19:11:48.277749	2025-03-26 00:40:11.087885	f	f	23	\N
9	2025-03-26 00:50:06.147235	2025-03-26 00:50:06.147235	f	f	18	\N
10	2025-03-26 01:01:34.420666	2025-03-26 01:01:34.420666	f	f	18	\N
11	2025-03-26 08:40:12.867236	2025-03-26 08:40:12.867236	f	f	14	\N
\.


--
-- TOC entry 5200 (class 0 OID 16728)
-- Dependencies: 233
-- Data for Name: document_exports; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.document_exports (id, user_id, file_id, file_name, export_date) FROM stdin;
\.


--
-- TOC entry 5233 (class 0 OID 27031)
-- Dependencies: 267
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_attachments (id, message_id, file_path, file_name, file_type, file_size, created_at) FROM stdin;
\.


--
-- TOC entry 5231 (class 0 OID 27014)
-- Dependencies: 265
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reactions (message_id, user_id, reaction, created_at) FROM stdin;
\.


--
-- TOC entry 5230 (class 0 OID 26988)
-- Dependencies: 264
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, content, created_at, is_read, is_system_message, parent_message_id) FROM stdin;
2	3	1	Note: You inquired about your own business listing.	2025-03-23 23:19:21.852038	f	t	\N
3	3	1	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 3-6\n\nMessage: addsafsfasfdadsfsafbdf	2025-03-23 23:19:21.852038	f	f	\N
4	4	5	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 3-6\n\nMessage: Hello	2025-03-24 14:58:55.356179	f	f	\N
5	5	1	Note: You inquired about your own business listing.	2025-03-24 15:54:34.327674	f	t	\N
6	5	1	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 0-3\n\nMessage: hey	2025-03-24 15:54:34.327674	f	f	\N
7	6	1	Note: You inquired about your own business listing.	2025-03-24 19:19:35.247024	f	t	\N
8	6	1	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 3-6\n\nMessage: Hello	2025-03-24 19:19:35.247024	f	f	\N
9	7	1	Note: You inquired about your own business listing.	2025-03-25 17:35:19.31641	f	t	\N
10	7	1	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 0-3\n\nMessage: hey	2025-03-25 17:35:19.31641	f	f	\N
11	8	1	Note: You inquired about your own business listing.	2025-03-25 19:11:48.277749	f	t	\N
12	8	1	Hello, I'm interested in your business " LuxeJet Travel Services".\n      \nTimeframe: 0-3\n\nMessage: hello	2025-03-25 19:11:48.277749	f	f	\N
13	8	1	hey	2025-03-26 00:35:28.866498	f	f	\N
14	8	1	hey how are you doing	2025-03-26 00:40:01.299948	f	f	\N
15	8	1	i am good	2025-03-26 00:40:11.086455	f	f	\N
16	9	1	Note: You inquired about your own business listing.	2025-03-26 00:50:06.147235	f	t	\N
17	9	1	Hello, I'm interested in your business "TechNova Electronics".\n      \nTimeframe: 0-3\n\nMessage: hey	2025-03-26 00:50:06.147235	f	f	\N
18	10	2	Hello, I'm interested in your business "TechNova Electronics".\n      \nTimeframe: 0-3\n\nMessage: Hey I wanna speak to you	2025-03-26 01:01:34.420666	t	f	\N
19	11	6	Hello, I'm interested in your business "Charlies Chocolates ".\n      \nTimeframe: 0-3\n\nMessage: Hi I am interested to buy your business	2025-03-26 08:40:12.867236	f	f	\N
\.


--
-- TOC entry 5202 (class 0 OID 16746)
-- Dependencies: 236
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_history (id, user_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, created_at) FROM stdin;
\.


--
-- TOC entry 5204 (class 0 OID 16751)
-- Dependencies: 238
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, price, description, stripe_product_id, stripe_price_id, created_at, updated_at) FROM stdin;
1	gold	39.00	Gold Plan with verified ID and ScoutSights	prod_RWAM5xjyVPSxGJ	price_xxx	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
2	platinum	50.00	Platinum Plan with all features including Off Market Leads	prod_RWAVR2LGingUrm	price_yyy	2025-01-03 11:26:12.914971	2025-01-03 11:26:12.914971
\.


--
-- TOC entry 5206 (class 0 OID 16760)
-- Dependencies: 240
-- Data for Name: saved_businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_businesses (id, user_id, business_id, saved_at) FROM stdin;
35	1	23	2025-03-16 07:29:35.749419+00
36	1	19	2025-03-18 09:16:40.877664+00
37	1	18	2025-03-18 09:16:42.510668+00
\.


--
-- TOC entry 5208 (class 0 OID 16765)
-- Dependencies: 242
-- Data for Name: scraped_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraped_data (id, source_url, business_name, industry, price, revenue, ebitda, location, employees, valuation, scraped_at, net_profit, price_text, price_min, price_max) FROM stdin;
\.


--
-- TOC entry 5210 (class 0 OID 16772)
-- Dependencies: 244
-- Data for Name: subscription_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_events (id, user_id, event_type, plan_type, stripe_event_id, created_at) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 16777)
-- Dependencies: 246
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, stripe_subscription_id, plan_type, status, current_period_start, current_period_end, cancelled_at, created_at, updated_at, subscription_status, subscription_end_date, trial_end_date) FROM stdin;
\.


--
-- TOC entry 5218 (class 0 OID 17032)
-- Dependencies: 252
-- Data for Name: upload_requests; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.upload_requests (id, request_id, user_id, created_at, processed) FROM stdin;
\.


--
-- TOC entry 5214 (class 0 OID 16784)
-- Dependencies: 248
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users (id, username, email, created_at, google_id, microsoft_id, linkedin_id, auth_provider, updated_at, profile_picture, stripe_customer_id, api_calls_count, subscription_end, subscription_type, google_tokens, s3_profile_picture, last_login, role, last_active) FROM stdin;
1	ZumaTornado1	michaaldekoya@gmail.com	2024-12-31 08:47:47.558134	114578497427689505810	\N	\N	email	2025-01-09 01:09:04.665839	/uploads/profiles/profile-1736384944604-797407904.png	cus_RtBXjRXZ6OJ9Tg	0	\N	free	\N	\N	2025-03-26 08:16:36.264539	admin	2025-03-26 08:38:23.946441
3	ZumaTornado1	michaeladekoya321@gmail.com	2025-03-05 09:26:56.881968	\N	\N	\N	email	2025-03-05 09:26:56.881968	/images/default_profile5.png	\N	0	\N	free	\N	\N	\N	user	2025-03-05 09:26:56.881968
4	ZumaTornado1	notzuma123@gmail.com	2025-03-05 11:11:30.393493	\N	\N	\N	email	2025-03-05 11:11:30.393493	/images/default_profile1.png	\N	0	\N	free	\N	\N	\N	user	2025-03-05 11:11:30.393493
6	Adekoya	notzuma1234@gmail.com	2025-03-26 08:32:24.514427	\N	\N	\N	email	2025-03-26 08:32:24.514427	/images/default_profile5.png	\N	0	\N	free	\N	\N	2025-03-26 08:38:03.091079	user	2025-03-26 09:09:47.689549
2	ZumaTornado1	zumaadekoya@gmail.com	2024-12-31 16:15:09.305415	\N	\N	\N	email	2025-01-07 23:29:47.507655	\N	\N	0	\N	free	\N	\N	2025-03-26 00:49:25.868453	user	2025-03-26 01:01:34.420666
5	michael_518	collinsokoro49@gmail.com	2025-03-24 14:58:55.332007	\N	\N	\N	email	2025-03-24 14:58:55.332007	/images/default_profile4.png	\N	0	\N	free	\N	\N	\N	user	2025-03-24 14:58:55.356179
\.


--
-- TOC entry 5215 (class 0 OID 16795)
-- Dependencies: 249
-- Data for Name: users_auth; Type: TABLE DATA; Schema: public; Owner: marketplace_user
--

COPY public.users_auth (user_id, password_hash, verified, verification_token, verification_expires) FROM stdin;
1	$2b$10$W6mEBMR260jQtrIegGeQM.JQ0FJJT5E9tj06ZAaWRds0b5w72GxZ2	t	\N	\N
2	$2b$10$VbZChMxme0i6qQ7gOBtESe47uOzNHRer/5lvAM1kDbn8NF5QwAm7u	t	\N	\N
3	$2b$10$w4lfuJIdETe6SgD6sWi6IePA50/C9HBhxapOGpKTqWe89bqcm4hMK	f	\N	\N
4	$2b$10$HkqVayn7O/pQL9OiCY7Bi.Z5ePDJpMvWvpeWuhDf1zqmFDc.4OTQe	t	\N	\N
6	$2b$10$U4YW36/RkE6rxuCwvMWsbufKoW4eWwCD7I7JEhMbNvuqanURSfHN2	t	\N	\N
\.


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 253
-- Name: ai_credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.ai_credits_id_seq', 5, true);


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 255
-- Name: assistant_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.assistant_interactions_id_seq', 18, true);


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 257
-- Name: assistant_prompts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.assistant_prompts_id_seq', 6, true);


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 226
-- Name: business_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_history_id_seq', 174, true);


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 228
-- Name: business_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_images_id_seq', 1, false);


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 270
-- Name: business_inquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_inquiries_id_seq', 12, true);


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 230
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.businesses_id_seq', 23, true);


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 268
-- Name: contact_forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_forms_id_seq', 1, false);


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 232
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 4, true);


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 260
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 11, true);


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 234
-- Name: document_exports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.document_exports_id_seq', 1, false);


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 266
-- Name: message_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_attachments_id_seq', 1, false);


--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 263
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 19, true);


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 237
-- Name: payment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_history_id_seq', 1, false);


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 239
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 2, true);


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 241
-- Name: saved_businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_businesses_id_seq', 37, true);


--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 243
-- Name: scraped_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scraped_data_id_seq', 1, false);


--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 245
-- Name: subscription_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_events_id_seq', 1, false);


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 247
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 251
-- Name: upload_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.upload_requests_id_seq', 1, false);


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 250
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: marketplace_user
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- TOC entry 4977 (class 2606 OID 25338)
-- Name: ai_credits ai_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits
    ADD CONSTRAINT ai_credits_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 25366)
-- Name: assistant_interactions assistant_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions
    ADD CONSTRAINT assistant_interactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 25382)
-- Name: assistant_prompts assistant_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_prompts
    ADD CONSTRAINT assistant_prompts_pkey PRIMARY KEY (id);


--
-- TOC entry 4912 (class 2606 OID 16815)
-- Name: business_history business_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4920 (class 2606 OID 16817)
-- Name: business_images business_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_pkey PRIMARY KEY (id);


--
-- TOC entry 5006 (class 2606 OID 27261)
-- Name: business_inquiries business_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_inquiries
    ADD CONSTRAINT business_inquiries_pkey PRIMARY KEY (id);


--
-- TOC entry 4922 (class 2606 OID 16819)
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 27211)
-- Name: contact_forms contact_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms
    ADD CONSTRAINT contact_forms_pkey PRIMARY KEY (id);


--
-- TOC entry 4927 (class 2606 OID 16821)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 26976)
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);


--
-- TOC entry 4986 (class 2606 OID 26964)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4930 (class 2606 OID 16823)
-- Name: document_exports document_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports
    ADD CONSTRAINT document_exports_pkey PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 27039)
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 4996 (class 2606 OID 27019)
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id);


--
-- TOC entry 4994 (class 2606 OID 26998)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4933 (class 2606 OID 16825)
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4935 (class 2606 OID 16827)
-- Name: payment_history payment_history_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- TOC entry 4937 (class 2606 OID 16829)
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- TOC entry 4941 (class 2606 OID 16831)
-- Name: saved_businesses saved_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4943 (class 2606 OID 16833)
-- Name: saved_businesses saved_businesses_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 4945 (class 2606 OID 16835)
-- Name: scraped_data scraped_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data
    ADD CONSTRAINT scraped_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4947 (class 2606 OID 16837)
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4951 (class 2606 OID 16839)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 16841)
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- TOC entry 4918 (class 2606 OID 16843)
-- Name: business_history unique_recent_view; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT unique_recent_view UNIQUE (user_id, business_id, viewed_at);


--
-- TOC entry 4973 (class 2606 OID 17041)
-- Name: upload_requests upload_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests
    ADD CONSTRAINT upload_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4975 (class 2606 OID 17043)
-- Name: upload_requests upload_requests_request_id_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.upload_requests
    ADD CONSTRAINT upload_requests_request_id_key UNIQUE (request_id);


--
-- TOC entry 4969 (class 2606 OID 16845)
-- Name: users_auth users_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4962 (class 2606 OID 16847)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4964 (class 2606 OID 16849)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4966 (class 2606 OID 16851)
-- Name: users users_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- TOC entry 4978 (class 1259 OID 25344)
-- Name: idx_ai_credits_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_ai_credits_user_id ON public.ai_credits USING btree (user_id);


--
-- TOC entry 4981 (class 1259 OID 25372)
-- Name: idx_assistant_interactions_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_assistant_interactions_user_id ON public.assistant_interactions USING btree (user_id);


--
-- TOC entry 4913 (class 1259 OID 16852)
-- Name: idx_business_history_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_business ON public.business_history USING btree (business_id);


--
-- TOC entry 4914 (class 1259 OID 16853)
-- Name: idx_business_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user ON public.business_history USING btree (user_id);


--
-- TOC entry 4915 (class 1259 OID 16854)
-- Name: idx_business_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_user_id ON public.business_history USING btree (user_id);


--
-- TOC entry 4916 (class 1259 OID 16855)
-- Name: idx_business_history_viewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_history_viewed_at ON public.business_history USING btree (viewed_at);


--
-- TOC entry 5007 (class 1259 OID 27267)
-- Name: idx_business_inquiries_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_inquiries_business_id ON public.business_inquiries USING btree (business_id);


--
-- TOC entry 5008 (class 1259 OID 27310)
-- Name: idx_business_inquiries_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_inquiries_conversation_id ON public.business_inquiries USING btree (conversation_id);


--
-- TOC entry 5009 (class 1259 OID 27268)
-- Name: idx_business_inquiries_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_inquiries_created_at ON public.business_inquiries USING btree (created_at);


--
-- TOC entry 5010 (class 1259 OID 27269)
-- Name: idx_business_inquiries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_business_inquiries_status ON public.business_inquiries USING btree (status);


--
-- TOC entry 5001 (class 1259 OID 27233)
-- Name: idx_contact_forms_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_forms_business_id ON public.contact_forms USING btree (business_id);


--
-- TOC entry 5002 (class 1259 OID 27234)
-- Name: idx_contact_forms_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_forms_conversation_id ON public.contact_forms USING btree (conversation_id);


--
-- TOC entry 5003 (class 1259 OID 27235)
-- Name: idx_contact_forms_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_forms_created_at ON public.contact_forms USING btree (created_at);


--
-- TOC entry 5004 (class 1259 OID 27232)
-- Name: idx_contact_forms_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_forms_user_id ON public.contact_forms USING btree (user_id);


--
-- TOC entry 4928 (class 1259 OID 16856)
-- Name: idx_contacts_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_business_id ON public.contacts USING btree (business_id);


--
-- TOC entry 4990 (class 1259 OID 27048)
-- Name: idx_conversation_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);


--
-- TOC entry 4987 (class 1259 OID 27045)
-- Name: idx_conversation_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversation_updated_at ON public.conversations USING btree (updated_at);


--
-- TOC entry 4923 (class 1259 OID 16857)
-- Name: idx_date_listed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_date_listed ON public.businesses USING btree (date_listed);


--
-- TOC entry 4924 (class 1259 OID 16858)
-- Name: idx_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_industry ON public.businesses USING btree (industry);


--
-- TOC entry 4925 (class 1259 OID 16859)
-- Name: idx_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location ON public.businesses USING btree (location);


--
-- TOC entry 4991 (class 1259 OID 27046)
-- Name: idx_message_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_conversation_id ON public.messages USING btree (conversation_id);


--
-- TOC entry 4992 (class 1259 OID 27047)
-- Name: idx_message_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_created_at ON public.messages USING btree (created_at);


--
-- TOC entry 4931 (class 1259 OID 16860)
-- Name: idx_payment_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_user_id ON public.payment_history USING btree (user_id);


--
-- TOC entry 4938 (class 1259 OID 16861)
-- Name: idx_saved_businesses_business; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_business ON public.saved_businesses USING btree (business_id);


--
-- TOC entry 4939 (class 1259 OID 16862)
-- Name: idx_saved_businesses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_businesses_user ON public.saved_businesses USING btree (user_id);


--
-- TOC entry 4948 (class 1259 OID 16863)
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- TOC entry 4949 (class 1259 OID 16864)
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- TOC entry 4970 (class 1259 OID 17044)
-- Name: idx_upload_requests_request_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_upload_requests_request_id ON public.upload_requests USING btree (request_id);


--
-- TOC entry 4971 (class 1259 OID 17045)
-- Name: idx_upload_requests_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_upload_requests_user_id ON public.upload_requests USING btree (user_id);


--
-- TOC entry 4954 (class 1259 OID 16865)
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider);


--
-- TOC entry 4967 (class 1259 OID 16866)
-- Name: idx_users_auth_user_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_auth_user_id ON public.users_auth USING btree (user_id);


--
-- TOC entry 4955 (class 1259 OID 16867)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4956 (class 1259 OID 16868)
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- TOC entry 4957 (class 1259 OID 27117)
-- Name: idx_users_last_active; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active);


--
-- TOC entry 4958 (class 1259 OID 27074)
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login);


--
-- TOC entry 4959 (class 1259 OID 16869)
-- Name: idx_users_linkedin_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_linkedin_id ON public.users USING btree (linkedin_id);


--
-- TOC entry 4960 (class 1259 OID 16870)
-- Name: idx_users_microsoft_id; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE INDEX idx_users_microsoft_id ON public.users USING btree (microsoft_id);


--
-- TOC entry 4984 (class 1259 OID 26243)
-- Name: market_trends_mv_idx; Type: INDEX; Schema: public; Owner: marketplace_user
--

CREATE UNIQUE INDEX market_trends_mv_idx ON public.market_trends_mv USING btree (date, industry, location);


--
-- TOC entry 5040 (class 2620 OID 16874)
-- Name: businesses refresh_market_trends; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_market_trends AFTER INSERT OR DELETE OR UPDATE ON public.businesses FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_market_trends_mv();


--
-- TOC entry 5041 (class 2620 OID 35929)
-- Name: users set_default_profile_picture; Type: TRIGGER; Schema: public; Owner: marketplace_user
--

CREATE TRIGGER set_default_profile_picture BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.assign_random_profile_picture();


--
-- TOC entry 5043 (class 2620 OID 27120)
-- Name: messages trg_update_user_last_active_on_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_user_last_active_on_message AFTER INSERT ON public.messages FOR EACH ROW WHEN ((new.sender_id IS NOT NULL)) EXECUTE FUNCTION public.update_user_last_active();


--
-- TOC entry 5042 (class 2620 OID 27119)
-- Name: conversation_participants trg_update_user_last_active_on_read; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_user_last_active_on_read AFTER UPDATE OF last_read_at ON public.conversation_participants FOR EACH ROW WHEN ((new.last_read_at IS DISTINCT FROM old.last_read_at)) EXECUTE FUNCTION public.update_user_last_active();


--
-- TOC entry 5044 (class 2620 OID 27051)
-- Name: messages trigger_update_conversation_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_conversation_timestamp AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


--
-- TOC entry 5023 (class 2606 OID 25339)
-- Name: ai_credits ai_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.ai_credits
    ADD CONSTRAINT ai_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5011 (class 2606 OID 16876)
-- Name: business_history business_history_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 5012 (class 2606 OID 16881)
-- Name: business_history business_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_history
    ADD CONSTRAINT business_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5013 (class 2606 OID 16886)
-- Name: business_images business_images_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 5038 (class 2606 OID 27262)
-- Name: business_inquiries business_inquiries_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_inquiries
    ADD CONSTRAINT business_inquiries_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- TOC entry 5039 (class 2606 OID 27305)
-- Name: business_inquiries business_inquiries_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_inquiries
    ADD CONSTRAINT business_inquiries_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- TOC entry 5014 (class 2606 OID 16891)
-- Name: businesses businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5034 (class 2606 OID 27217)
-- Name: contact_forms contact_forms_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms
    ADD CONSTRAINT contact_forms_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- TOC entry 5035 (class 2606 OID 27227)
-- Name: contact_forms contact_forms_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms
    ADD CONSTRAINT contact_forms_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- TOC entry 5036 (class 2606 OID 27222)
-- Name: contact_forms contact_forms_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms
    ADD CONSTRAINT contact_forms_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5037 (class 2606 OID 27212)
-- Name: contact_forms contact_forms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_forms
    ADD CONSTRAINT contact_forms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5015 (class 2606 OID 16896)
-- Name: contacts contacts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- TOC entry 5026 (class 2606 OID 26977)
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5027 (class 2606 OID 26982)
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5025 (class 2606 OID 26965)
-- Name: conversations conversations_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- TOC entry 5016 (class 2606 OID 16901)
-- Name: document_exports document_exports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.document_exports
    ADD CONSTRAINT document_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5024 (class 2606 OID 25367)
-- Name: assistant_interactions fk_user; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.assistant_interactions
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5033 (class 2606 OID 27040)
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- TOC entry 5031 (class 2606 OID 27020)
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- TOC entry 5032 (class 2606 OID 27025)
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5028 (class 2606 OID 26999)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5029 (class 2606 OID 27009)
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- TOC entry 5030 (class 2606 OID 27004)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5017 (class 2606 OID 16906)
-- Name: payment_history payment_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5018 (class 2606 OID 16911)
-- Name: saved_businesses saved_businesses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- TOC entry 5019 (class 2606 OID 16916)
-- Name: saved_businesses saved_businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_businesses
    ADD CONSTRAINT saved_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5020 (class 2606 OID 16921)
-- Name: subscription_events subscription_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5021 (class 2606 OID 16926)
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5022 (class 2606 OID 16931)
-- Name: users_auth users_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: marketplace_user
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO marketplace_user;


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE business_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.business_history TO marketplace_user;


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE business_images; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.business_images TO marketplace_user;


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE businesses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.businesses TO marketplace_user;


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE businesses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.businesses_id_seq TO marketplace_user;


--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contacts TO marketplace_user;


--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.contacts_id_seq TO marketplace_user;


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE industry_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.industry_metrics TO marketplace_user;


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE payment_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_history TO marketplace_user;


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.plans TO marketplace_user;


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE saved_businesses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.saved_businesses TO marketplace_user;


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE scraped_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scraped_data TO marketplace_user;


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE subscription_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscription_events TO marketplace_user;


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO marketplace_user;


--
-- TOC entry 2182 (class 826 OID 25291)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: marketplace_user
--

ALTER DEFAULT PRIVILEGES FOR ROLE marketplace_user IN SCHEMA public GRANT ALL ON TABLES TO marketplace_user;


--
-- TOC entry 5225 (class 0 OID 26231)
-- Dependencies: 259 5239
-- Name: market_trends_mv; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: marketplace_user
--

REFRESH MATERIALIZED VIEW public.market_trends_mv;


-- Completed on 2025-03-26 09:22:29

--
-- PostgreSQL database dump complete
--

