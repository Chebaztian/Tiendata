--
-- PostgreSQL database dump
--

\restrict hRvVySTNPFbTBlaWpWtPQHNGtyl4rtTI63jPESJNlbP5FXa7BtzyTvXihEzOqLN

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

-- Started on 2026-03-27 17:41:15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 886 (class 1247 OID 35375)
-- Name: tipo_operacion_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_operacion_enum AS ENUM (
    'ENTRADA',
    'SALIDA',
    'AJUSTE'
);


ALTER TYPE public.tipo_operacion_enum OWNER TO postgres;

--
-- TOC entry 253 (class 1255 OID 35381)
-- Name: actualizar_stock(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tipo_op tipo_operacion_enum;
    motivo_nombre text;
BEGIN
    SELECT tipo_operacion, nombre_motivo
      INTO tipo_op, motivo_nombre
    FROM motivos_movimiento
    WHERE id_motivo = NEW.id_motivo;

    IF tipo_op = 'ENTRADA' OR (tipo_op = 'AJUSTE' AND LOWER(motivo_nombre) LIKE '%sobrante%') THEN
        NEW.stock_posterior := NEW.stock_anterior + NEW.cantidad;
    ELSE
        NEW.stock_posterior := NEW.stock_anterior - NEW.cantidad;
        IF NEW.stock_posterior < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente';
        END IF;
    END IF;

    UPDATE productos
    SET stock_actual = NEW.stock_posterior
    WHERE id_producto = NEW.id_producto;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_stock() OWNER TO postgres;

--
-- TOC entry 252 (class 1255 OID 35382)
-- Name: evitar_delete_movimientos(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.evitar_delete_movimientos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'No se permite eliminar registros';
END;
$$;


ALTER FUNCTION public.evitar_delete_movimientos() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 35383)
-- Name: acciones_auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.acciones_auditoria (
    id_accion integer NOT NULL,
    nombre_accion character varying(50) NOT NULL
);


ALTER TABLE public.acciones_auditoria OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 35388)
-- Name: acciones_auditoria_id_accion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.acciones_auditoria ALTER COLUMN id_accion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.acciones_auditoria_id_accion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 221 (class 1259 OID 35389)
-- Name: ajustes_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ajustes_inventario (
    id_ajuste integer NOT NULL,
    id_usuario integer,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_producto integer,
    cantidad integer DEFAULT 0 NOT NULL,
    motivo text,
    tipo_ajuste character varying(20),
    CONSTRAINT ajustes_inventario_tipo_ajuste_check CHECK (((tipo_ajuste)::text = ANY ((ARRAY['SOBRANTE'::character varying, 'FALTANTE'::character varying])::text[])))
);


ALTER TABLE public.ajustes_inventario OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 35394)
-- Name: ajustes_inventario_id_ajuste_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ajustes_inventario_id_ajuste_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ajustes_inventario_id_ajuste_seq OWNER TO postgres;

--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 222
-- Name: ajustes_inventario_id_ajuste_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ajustes_inventario_id_ajuste_seq OWNED BY public.ajustes_inventario.id_ajuste;


--
-- TOC entry 223 (class 1259 OID 35395)
-- Name: auditoria_detalles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria_detalles (
    id_detalle integer NOT NULL,
    id_auditoria integer NOT NULL,
    campo_modificado character varying(50) NOT NULL,
    valor_anterior text,
    valor_nuevo text
);


ALTER TABLE public.auditoria_detalles OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 35403)
-- Name: auditoria_detalles_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auditoria_detalles ALTER COLUMN id_detalle ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditoria_detalles_id_detalle_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 35404)
-- Name: auditoria_operaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria_operaciones (
    id_auditoria integer NOT NULL,
    id_usuario integer NOT NULL,
    id_accion integer NOT NULL,
    entidad_afectada character varying(50) NOT NULL,
    id_entidad_afectada integer NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.auditoria_operaciones OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 35413)
-- Name: auditoria_operaciones_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auditoria_operaciones ALTER COLUMN id_auditoria ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditoria_operaciones_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 227 (class 1259 OID 35414)
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id_categoria integer NOT NULL,
    nombre_categoria character varying(100) NOT NULL,
    descripcion text,
    estado boolean DEFAULT true
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 35422)
-- Name: categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.categorias ALTER COLUMN id_categoria ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categorias_id_categoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 229 (class 1259 OID 35423)
-- Name: codigos_barras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.codigos_barras (
    id_codigo integer NOT NULL,
    id_producto integer,
    codigo character varying(100)
);


ALTER TABLE public.codigos_barras OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 35427)
-- Name: codigos_barras_id_codigo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.codigos_barras_id_codigo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.codigos_barras_id_codigo_seq OWNER TO postgres;

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 230
-- Name: codigos_barras_id_codigo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.codigos_barras_id_codigo_seq OWNED BY public.codigos_barras.id_codigo;


--
-- TOC entry 231 (class 1259 OID 35428)
-- Name: configuracion_sistema; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuracion_sistema (
    id_parametro integer NOT NULL,
    nombre_tienda character varying(100) NOT NULL,
    moneda character varying(10) NOT NULL,
    stock_minimo_default integer NOT NULL,
    stock_maximo_default integer NOT NULL,
    prefijo_codigo_barras character varying(10),
    CONSTRAINT cfg_stock_max_mayor_min CHECK ((stock_maximo_default >= stock_minimo_default)),
    CONSTRAINT cfg_stock_maximo_positivo CHECK ((stock_maximo_default >= 0)),
    CONSTRAINT cfg_stock_minimo_positivo CHECK ((stock_minimo_default >= 0))
);


ALTER TABLE public.configuracion_sistema OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 35439)
-- Name: configuracion_sistema_id_parametro_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_sistema_id_parametro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_sistema_id_parametro_seq OWNER TO postgres;

--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 232
-- Name: configuracion_sistema_id_parametro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_sistema_id_parametro_seq OWNED BY public.configuracion_sistema.id_parametro;


--
-- TOC entry 233 (class 1259 OID 35440)
-- Name: exportaciones_reportes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exportaciones_reportes (
    id_exportacion integer NOT NULL,
    tipo_reporte character varying(100) NOT NULL,
    formato character varying(10),
    fecha_generacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_generador integer,
    ruta_archivo text,
    CONSTRAINT exportaciones_reportes_formato_check CHECK (((formato)::text = ANY (ARRAY[('PDF'::character varying)::text, ('EXCEL'::character varying)::text])))
);


ALTER TABLE public.exportaciones_reportes OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 35449)
-- Name: exportaciones_reportes_id_exportacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exportaciones_reportes_id_exportacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exportaciones_reportes_id_exportacion_seq OWNER TO postgres;

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 234
-- Name: exportaciones_reportes_id_exportacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exportaciones_reportes_id_exportacion_seq OWNED BY public.exportaciones_reportes.id_exportacion;


--
-- TOC entry 235 (class 1259 OID 35450)
-- Name: motivos_movimiento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.motivos_movimiento (
    id_motivo integer NOT NULL,
    nombre_motivo character varying(50) NOT NULL,
    tipo_operacion public.tipo_operacion_enum NOT NULL
);


ALTER TABLE public.motivos_movimiento OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 35456)
-- Name: motivos_movimiento_id_motivo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.motivos_movimiento ALTER COLUMN id_motivo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.motivos_movimiento_id_motivo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 237 (class 1259 OID 35457)
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_inventario (
    id_movimiento integer NOT NULL,
    id_producto integer NOT NULL,
    id_usuario integer NOT NULL,
    id_proveedor integer,
    id_motivo integer NOT NULL,
    cantidad integer NOT NULL,
    stock_anterior integer NOT NULL,
    stock_posterior integer NOT NULL,
    numero_factura character varying(50),
    comentarios text,
    fecha_hora_exacta timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movimientos_inventario_cantidad_check CHECK ((cantidad > 0))
);


ALTER TABLE public.movimientos_inventario OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 35471)
-- Name: movimientos_inventario_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.movimientos_inventario ALTER COLUMN id_movimiento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.movimientos_inventario_id_movimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 239 (class 1259 OID 35472)
-- Name: permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permisos (
    id_permiso integer NOT NULL,
    nombre_permiso character varying(100) NOT NULL
);


ALTER TABLE public.permisos OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 35477)
-- Name: permisos_id_permiso_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.permisos ALTER COLUMN id_permiso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.permisos_id_permiso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 241 (class 1259 OID 35478)
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id_producto integer NOT NULL,
    id_categoria integer NOT NULL,
    codigo_barras_unico character varying(50) NOT NULL,
    nombre character varying(150) NOT NULL,
    precio_compra numeric(12,2) NOT NULL,
    precio_venta numeric(12,2) NOT NULL,
    stock_actual integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0,
    stock_maximo integer,
    fecha_vencimiento date,
    estado boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ubicacion character varying(100),
    descripcion text,
    CONSTRAINT productos_check1 CHECK ((stock_maximo >= stock_minimo)),
    CONSTRAINT productos_precio_compra_check CHECK ((precio_compra >= (0)::numeric)),
    CONSTRAINT productos_stock_actual_check CHECK ((stock_actual >= 0)),
    CONSTRAINT productos_stock_minimo_check CHECK ((stock_minimo >= 0))
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 35497)
-- Name: productos_id_producto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.productos ALTER COLUMN id_producto ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.productos_id_producto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 243 (class 1259 OID 35498)
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedores (
    id_proveedor integer NOT NULL,
    razon_social character varying(150) NOT NULL,
    nit_identificacion character varying(50) NOT NULL,
    telefono character varying(20),
    direccion text,
    correo character varying(100),
    estado boolean DEFAULT true
);


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 35507)
-- Name: proveedores_id_proveedor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.proveedores ALTER COLUMN id_proveedor ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.proveedores_id_proveedor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 245 (class 1259 OID 35508)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id_rol integer NOT NULL,
    nombre_rol character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 35515)
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ALTER COLUMN id_rol ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_rol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 247 (class 1259 OID 35516)
-- Name: roles_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles_permisos (
    id_rol integer NOT NULL,
    id_permiso integer NOT NULL
);


ALTER TABLE public.roles_permisos OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 35521)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    nombre character varying(100) NOT NULL,
    correo character varying(100) NOT NULL,
    contrasena character varying(255) NOT NULL,
    estado boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso timestamp without time zone,
    intentos_fallidos integer DEFAULT 0,
    bloqueado boolean DEFAULT false
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 35533)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 251 (class 1259 OID 35703)
-- Name: vista_movimientos_export; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_movimientos_export AS
 SELECT m.id_movimiento,
    p.codigo_barras_unico AS codigo_producto,
    p.nombre AS producto,
    u.nombre AS usuario,
    mm.nombre_motivo AS motivo,
    mm.tipo_operacion,
    m.cantidad,
    m.stock_anterior,
    m.stock_posterior,
    m.numero_factura,
    m.comentarios,
    m.fecha_hora_exacta,
    pr.razon_social AS proveedor
   FROM ((((public.movimientos_inventario m
     JOIN public.productos p ON ((p.id_producto = m.id_producto)))
     JOIN public.usuarios u ON ((u.id_usuario = m.id_usuario)))
     JOIN public.motivos_movimiento mm ON ((mm.id_motivo = m.id_motivo)))
     LEFT JOIN public.proveedores pr ON ((pr.id_proveedor = m.id_proveedor)));


ALTER VIEW public.vista_movimientos_export OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 35693)
-- Name: vista_productos_export; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_productos_export AS
 SELECT p.id_producto,
    p.codigo_barras_unico,
    p.nombre,
    p.descripcion,
    c.nombre_categoria AS categoria,
    p.precio_compra,
    p.precio_venta,
    p.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    p.fecha_vencimiento,
    p.ubicacion,
    p.estado,
    p.fecha_creacion
   FROM (public.productos p
     JOIN public.categorias c ON ((c.id_categoria = p.id_categoria)));


ALTER VIEW public.vista_productos_export OWNER TO postgres;

--
-- TOC entry 4943 (class 2604 OID 35538)
-- Name: ajustes_inventario id_ajuste; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario ALTER COLUMN id_ajuste SET DEFAULT nextval('public.ajustes_inventario_id_ajuste_seq'::regclass);


--
-- TOC entry 4948 (class 2604 OID 35539)
-- Name: codigos_barras id_codigo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_barras ALTER COLUMN id_codigo SET DEFAULT nextval('public.codigos_barras_id_codigo_seq'::regclass);


--
-- TOC entry 4949 (class 2604 OID 35540)
-- Name: configuracion_sistema id_parametro; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_sistema ALTER COLUMN id_parametro SET DEFAULT nextval('public.configuracion_sistema_id_parametro_seq'::regclass);


--
-- TOC entry 4950 (class 2604 OID 35541)
-- Name: exportaciones_reportes id_exportacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exportaciones_reportes ALTER COLUMN id_exportacion SET DEFAULT nextval('public.exportaciones_reportes_id_exportacion_seq'::regclass);


--
-- TOC entry 5199 (class 0 OID 35383)
-- Dependencies: 219
-- Data for Name: acciones_auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.acciones_auditoria (id_accion, nombre_accion) FROM stdin;
\.


--
-- TOC entry 5201 (class 0 OID 35389)
-- Dependencies: 221
-- Data for Name: ajustes_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ajustes_inventario (id_ajuste, id_usuario, fecha, id_producto, cantidad, motivo, tipo_ajuste) FROM stdin;
\.


--
-- TOC entry 5203 (class 0 OID 35395)
-- Dependencies: 223
-- Data for Name: auditoria_detalles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria_detalles (id_detalle, id_auditoria, campo_modificado, valor_anterior, valor_nuevo) FROM stdin;
\.


--
-- TOC entry 5205 (class 0 OID 35404)
-- Dependencies: 225
-- Data for Name: auditoria_operaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria_operaciones (id_auditoria, id_usuario, id_accion, entidad_afectada, id_entidad_afectada, fecha_hora) FROM stdin;
\.


--
-- TOC entry 5207 (class 0 OID 35414)
-- Dependencies: 227
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id_categoria, nombre_categoria, descripcion, estado) FROM stdin;
\.


--
-- TOC entry 5209 (class 0 OID 35423)
-- Dependencies: 229
-- Data for Name: codigos_barras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.codigos_barras (id_codigo, id_producto, codigo) FROM stdin;
\.


--
-- TOC entry 5211 (class 0 OID 35428)
-- Dependencies: 231
-- Data for Name: configuracion_sistema; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion_sistema (id_parametro, nombre_tienda, moneda, stock_minimo_default, stock_maximo_default, prefijo_codigo_barras) FROM stdin;
2	Mi Tienda	COP	5	100	\N
\.


--
-- TOC entry 5213 (class 0 OID 35440)
-- Dependencies: 233
-- Data for Name: exportaciones_reportes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exportaciones_reportes (id_exportacion, tipo_reporte, formato, fecha_generacion, usuario_generador, ruta_archivo) FROM stdin;
\.


--
-- TOC entry 5215 (class 0 OID 35450)
-- Dependencies: 235
-- Data for Name: motivos_movimiento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.motivos_movimiento (id_motivo, nombre_motivo, tipo_operacion) FROM stdin;
12	Compra / Reposición	ENTRADA
13	Devolución proveedor	ENTRADA
14	Venta	SALIDA
15	Dañado	SALIDA
16	Vencido	SALIDA
17	Merma	SALIDA
18	Ajuste sobrante	AJUSTE
19	Ajuste faltante	AJUSTE
20	Robo	AJUSTE
21	Rotura	AJUSTE
22	Caducidad	AJUSTE
23	Compra / Reposición	ENTRADA
24	Devolución proveedor	ENTRADA
25	Venta	SALIDA
26	Dañado	SALIDA
27	Vencido	SALIDA
28	Merma	SALIDA
29	Ajuste sobrante	AJUSTE
30	Ajuste faltante	AJUSTE
31	Robo	AJUSTE
32	Rotura	AJUSTE
33	Caducidad	AJUSTE
\.


--
-- TOC entry 5217 (class 0 OID 35457)
-- Dependencies: 237
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_inventario (id_movimiento, id_producto, id_usuario, id_proveedor, id_motivo, cantidad, stock_anterior, stock_posterior, numero_factura, comentarios, fecha_hora_exacta) FROM stdin;
\.


--
-- TOC entry 5219 (class 0 OID 35472)
-- Dependencies: 239
-- Data for Name: permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permisos (id_permiso, nombre_permiso) FROM stdin;
\.


--
-- TOC entry 5221 (class 0 OID 35478)
-- Dependencies: 241
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id_producto, id_categoria, codigo_barras_unico, nombre, precio_compra, precio_venta, stock_actual, stock_minimo, stock_maximo, fecha_vencimiento, estado, fecha_creacion, ubicacion, descripcion) FROM stdin;
\.


--
-- TOC entry 5223 (class 0 OID 35498)
-- Dependencies: 243
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedores (id_proveedor, razon_social, nit_identificacion, telefono, direccion, correo, estado) FROM stdin;
\.


--
-- TOC entry 5225 (class 0 OID 35508)
-- Dependencies: 245
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id_rol, nombre_rol, descripcion) FROM stdin;
1	Administrador	Acceso total al sistema: usuarios, ajustes, auditoría y configuración
2	Operador	Acceso operativo: consulta de inventario, entradas y salidas
\.


--
-- TOC entry 5227 (class 0 OID 35516)
-- Dependencies: 247
-- Data for Name: roles_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles_permisos (id_rol, id_permiso) FROM stdin;
\.


--
-- TOC entry 5228 (class 0 OID 35521)
-- Dependencies: 248
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usuario, id_rol, nombre, correo, contrasena, estado, fecha_creacion, ultimo_acceso, intentos_fallidos, bloqueado) FROM stdin;
\.


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 220
-- Name: acciones_auditoria_id_accion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.acciones_auditoria_id_accion_seq', 1, false);


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 222
-- Name: ajustes_inventario_id_ajuste_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ajustes_inventario_id_ajuste_seq', 1, false);


--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 224
-- Name: auditoria_detalles_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_detalles_id_detalle_seq', 1, false);


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 226
-- Name: auditoria_operaciones_id_auditoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_operaciones_id_auditoria_seq', 1, false);


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 228
-- Name: categorias_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_categoria_seq', 1, false);


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 230
-- Name: codigos_barras_id_codigo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.codigos_barras_id_codigo_seq', 1, false);


--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 232
-- Name: configuracion_sistema_id_parametro_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_sistema_id_parametro_seq', 2, true);


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 234
-- Name: exportaciones_reportes_id_exportacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exportaciones_reportes_id_exportacion_seq', 1, false);


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 236
-- Name: motivos_movimiento_id_motivo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.motivos_movimiento_id_motivo_seq', 33, true);


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 238
-- Name: movimientos_inventario_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_movimiento_seq', 1, false);


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 240
-- Name: permisos_id_permiso_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permisos_id_permiso_seq', 1, false);


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 242
-- Name: productos_id_producto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_producto_seq', 1, false);


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 244
-- Name: proveedores_id_proveedor_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedores_id_proveedor_seq', 1, false);


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 246
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_rol_seq', 2, true);


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 249
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 1, false);


--
-- TOC entry 4974 (class 2606 OID 35543)
-- Name: acciones_auditoria acciones_auditoria_nombre_accion_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.acciones_auditoria
    ADD CONSTRAINT acciones_auditoria_nombre_accion_key UNIQUE (nombre_accion);


--
-- TOC entry 4976 (class 2606 OID 35545)
-- Name: acciones_auditoria acciones_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.acciones_auditoria
    ADD CONSTRAINT acciones_auditoria_pkey PRIMARY KEY (id_accion);


--
-- TOC entry 4978 (class 2606 OID 35547)
-- Name: ajustes_inventario ajustes_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_pkey PRIMARY KEY (id_ajuste);


--
-- TOC entry 4983 (class 2606 OID 35549)
-- Name: auditoria_detalles auditoria_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_detalles
    ADD CONSTRAINT auditoria_detalles_pkey PRIMARY KEY (id_detalle);


--
-- TOC entry 4985 (class 2606 OID 35551)
-- Name: auditoria_operaciones auditoria_operaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_operaciones
    ADD CONSTRAINT auditoria_operaciones_pkey PRIMARY KEY (id_auditoria);


--
-- TOC entry 4987 (class 2606 OID 35553)
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- TOC entry 4991 (class 2606 OID 35555)
-- Name: codigos_barras codigos_barras_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_barras
    ADD CONSTRAINT codigos_barras_codigo_key UNIQUE (codigo);


--
-- TOC entry 4993 (class 2606 OID 35557)
-- Name: codigos_barras codigos_barras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_barras
    ADD CONSTRAINT codigos_barras_pkey PRIMARY KEY (id_codigo);


--
-- TOC entry 4995 (class 2606 OID 35561)
-- Name: configuracion_sistema configuracion_sistema_nombre_tienda_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_nombre_tienda_key UNIQUE (nombre_tienda);


--
-- TOC entry 4997 (class 2606 OID 35563)
-- Name: configuracion_sistema configuracion_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_pkey PRIMARY KEY (id_parametro);


--
-- TOC entry 4999 (class 2606 OID 35565)
-- Name: exportaciones_reportes exportaciones_reportes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exportaciones_reportes
    ADD CONSTRAINT exportaciones_reportes_pkey PRIMARY KEY (id_exportacion);


--
-- TOC entry 5001 (class 2606 OID 35567)
-- Name: motivos_movimiento motivos_movimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivos_movimiento
    ADD CONSTRAINT motivos_movimiento_pkey PRIMARY KEY (id_motivo);


--
-- TOC entry 5007 (class 2606 OID 35569)
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id_movimiento);


--
-- TOC entry 5009 (class 2606 OID 35571)
-- Name: permisos permisos_nombre_permiso_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_nombre_permiso_key UNIQUE (nombre_permiso);


--
-- TOC entry 5011 (class 2606 OID 35573)
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id_permiso);


--
-- TOC entry 5014 (class 2606 OID 35575)
-- Name: productos productos_codigo_barras_unico_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_barras_unico_key UNIQUE (codigo_barras_unico);


--
-- TOC entry 5016 (class 2606 OID 35577)
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- TOC entry 5018 (class 2606 OID 35579)
-- Name: proveedores proveedores_nit_identificacion_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_nit_identificacion_key UNIQUE (nit_identificacion);


--
-- TOC entry 5020 (class 2606 OID 35581)
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id_proveedor);


--
-- TOC entry 5024 (class 2606 OID 35583)
-- Name: roles roles_nombre_rol_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_rol_key UNIQUE (nombre_rol);


--
-- TOC entry 5028 (class 2606 OID 35585)
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (id_rol, id_permiso);


--
-- TOC entry 5026 (class 2606 OID 35587)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- TOC entry 4989 (class 2606 OID 35589)
-- Name: categorias unique_nombre_categoria; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT unique_nombre_categoria UNIQUE (nombre_categoria);

--
-- Name: idx_categorias_nombre_categoria_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_categorias_nombre_categoria_lower ON public.categorias USING btree (lower((nombre_categoria)::text));


--
-- TOC entry 5022 (class 2606 OID 35591)
-- Name: proveedores unique_razon_social; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT unique_razon_social UNIQUE (razon_social);


--
-- TOC entry 5030 (class 2606 OID 35595)
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- TOC entry 5032 (class 2606 OID 35597)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4979 (class 1259 OID 35710)
-- Name: idx_ajustes_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ajustes_fecha ON public.ajustes_inventario USING btree (fecha);


--
-- TOC entry 4980 (class 1259 OID 35708)
-- Name: idx_ajustes_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ajustes_producto ON public.ajustes_inventario USING btree (id_producto);


--
-- TOC entry 4981 (class 1259 OID 35709)
-- Name: idx_ajustes_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ajustes_usuario ON public.ajustes_inventario USING btree (id_usuario);


--
-- TOC entry 5002 (class 1259 OID 35598)
-- Name: idx_movimientos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_fecha ON public.movimientos_inventario USING btree (fecha_hora_exacta);


--
-- TOC entry 5003 (class 1259 OID 35599)
-- Name: idx_movimientos_motivo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_motivo ON public.movimientos_inventario USING btree (id_motivo);


--
-- TOC entry 5004 (class 1259 OID 35600)
-- Name: idx_movimientos_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_producto ON public.movimientos_inventario USING btree (id_producto);


--
-- TOC entry 5005 (class 1259 OID 35601)
-- Name: idx_movimientos_producto_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_producto_fecha ON public.movimientos_inventario USING btree (id_producto, fecha_hora_exacta);


--
-- TOC entry 5012 (class 1259 OID 35602)
-- Name: idx_productos_codigo_barras; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_codigo_barras ON public.productos USING btree (codigo_barras_unico);


--
-- TOC entry 5048 (class 2620 OID 35603)
-- Name: movimientos_inventario trigger_actualizar_stock; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_stock BEFORE INSERT ON public.movimientos_inventario FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock();


--
-- TOC entry 5049 (class 2620 OID 35679)
-- Name: movimientos_inventario trigger_evitar_delete_movimientos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_evitar_delete_movimientos BEFORE DELETE ON public.movimientos_inventario FOR EACH ROW EXECUTE FUNCTION public.evitar_delete_movimientos();


--
-- TOC entry 5033 (class 2606 OID 35667)
-- Name: ajustes_inventario ajustes_inventario_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto);


--
-- TOC entry 5034 (class 2606 OID 35662)
-- Name: ajustes_inventario ajustes_inventario_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5035 (class 2606 OID 35604)
-- Name: auditoria_detalles auditoria_detalles_id_auditoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_detalles
    ADD CONSTRAINT auditoria_detalles_id_auditoria_fkey FOREIGN KEY (id_auditoria) REFERENCES public.auditoria_operaciones(id_auditoria) ON DELETE CASCADE;


--
-- TOC entry 5036 (class 2606 OID 35609)
-- Name: auditoria_operaciones auditoria_operaciones_id_accion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_operaciones
    ADD CONSTRAINT auditoria_operaciones_id_accion_fkey FOREIGN KEY (id_accion) REFERENCES public.acciones_auditoria(id_accion);


--
-- TOC entry 5037 (class 2606 OID 35614)
-- Name: auditoria_operaciones auditoria_operaciones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_operaciones
    ADD CONSTRAINT auditoria_operaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5038 (class 2606 OID 35674)
-- Name: codigos_barras codigos_barras_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_barras
    ADD CONSTRAINT codigos_barras_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto);


--
-- TOC entry 5039 (class 2606 OID 35680)
-- Name: exportaciones_reportes exportaciones_reportes_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exportaciones_reportes
    ADD CONSTRAINT exportaciones_reportes_usuario_fkey FOREIGN KEY (usuario_generador) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5040 (class 2606 OID 35619)
-- Name: movimientos_inventario movimientos_inventario_id_motivo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_motivo_fkey FOREIGN KEY (id_motivo) REFERENCES public.motivos_movimiento(id_motivo);


--
-- TOC entry 5041 (class 2606 OID 35624)
-- Name: movimientos_inventario movimientos_inventario_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto);


--
-- TOC entry 5042 (class 2606 OID 35629)
-- Name: movimientos_inventario movimientos_inventario_id_proveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id_proveedor);


--
-- TOC entry 5043 (class 2606 OID 35634)
-- Name: movimientos_inventario movimientos_inventario_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5044 (class 2606 OID 35639)
-- Name: productos productos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria);


--
-- TOC entry 5045 (class 2606 OID 35644)
-- Name: roles_permisos roles_permisos_id_permiso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES public.permisos(id_permiso) ON DELETE CASCADE;


--
-- TOC entry 5046 (class 2606 OID 35649)
-- Name: roles_permisos roles_permisos_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol) ON DELETE CASCADE;


--
-- TOC entry 5047 (class 2606 OID 35654)
-- Name: usuarios usuarios_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol);


-- Completed on 2026-03-27 17:41:15

--
-- PostgreSQL database dump complete
--
-- Usuario administrador demo
INSERT INTO public.usuarios (id_rol, nombre, correo, contrasena, estado)
VALUES (1, 'Administrador Demo', 'admin@tiendata.com', '$2a$10$uEU8GTWsqyaN2FvPEi/eqOyLQJ3ezonxXSzAujSgB2hlwn8ZY75ku', true)
ON CONFLICT (correo) DO NOTHING;
INSERT INTO public.proveedores
(razon_social, nit_identificacion, telefono, direccion, correo, estado)
VALUES
('Proveedor Demo', '900123456', '3000000000', 'Bogota', 'proveedor@demo.com', true);
\unrestrict hRvVySTNPFbTBlaWpWtPQHNGtyl4rtTI63jPESJNlbP5FXa7BtzyTvXihEzOqLN
