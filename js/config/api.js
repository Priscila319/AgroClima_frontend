const runtimeConfig = globalThis.__AGROCLIMA_CONFIG__ || {};
const buildConfig = import.meta.env || {};

function normalizeBase(value, fallback) {
  return String(value || fallback).replace(/\/+$/, '');
}

/** Bases centralizadas. O padrão é same-origin e o proxy/ingress roteia aos serviços. */
export const API_BASE_URLS = Object.freeze({
  java: normalizeBase(runtimeConfig.javaApiBase || buildConfig.VITE_API_JAVA_BASE, '/api/java'),
  python: normalizeBase(runtimeConfig.pythonApiBase || buildConfig.VITE_API_PYTHON_BASE, '/api/python'),
});
