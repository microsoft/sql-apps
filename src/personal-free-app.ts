import { z } from 'zod';
import { parseAppPrincipal, type AppRole } from './swa-principal.js';
import type { ProcedureDefinition } from './sql-procedure-runtime.js';

export interface PersonalFreeRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: `/api/${string}`;
  roles?: readonly AppRole[];
  procedure: ProcedureDefinition;
}

export interface PersonalFreeRuntime {
  execute(
    ownerId: string,
    role: AppRole,
    procedure: string,
    values: Record<string, string | boolean | number | null>,
  ): Promise<unknown[]>;
  ready(): Promise<void>;
}

export interface PersonalFreeRequest {
  method: string;
  url: string;
  headers: Headers;
  body?: unknown;
}

const scalar = z.union([z.string(), z.boolean(), z.number(), z.null()]);
const dateTime = z.union([z.iso.date(), z.iso.datetime({ offset: true, local: true })]);

export function parsePersonalFreeBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error('Invalid JSON request body'), { statusCode: 400 });
    }
    throw error;
  }
}

function validParameter(type: ProcedureDefinition['parameters'][string], value: string | boolean | number | null): boolean {
  if (value === null) return true;
  if (type === 'nvarchar') return typeof value === 'string';
  if (type === 'uniqueidentifier') return typeof value === 'string' && z.uuid().safeParse(value).success;
  if (type === 'bit') return typeof value === 'boolean';
  if (type === 'int') {
    return typeof value === 'number' && Number.isInteger(value) &&
      value >= -2_147_483_648 && value <= 2_147_483_647;
  }
  if (typeof value !== 'string' || !dateTime.safeParse(value).success) return false;
  const year = new Date(value).getUTCFullYear();
  return year >= 1 && year <= 9999;
}

// Query strings carry only text, so declared int/bit parameters are converted from their canonical forms.
function queryParameters(
  search: URLSearchParams,
  parameters: ProcedureDefinition['parameters'],
): Record<string, string | boolean | number> | null {
  const values: Record<string, string | boolean | number> = {};
  for (const name of new Set(search.keys())) {
    const all = search.getAll(name);
    if (all.length !== 1) return null;
    const text = all[0]!;
    const type = parameters[name];
    if (type === 'int') {
      if (!/^-?(0|[1-9][0-9]{0,9})$/.test(text)) return null;
      values[name] = Number(text);
    } else if (type === 'bit') {
      if (text !== 'true' && text !== 'false') return null;
      values[name] = text === 'true';
    } else {
      if (type !== 'nvarchar' && text === '') return null;
      values[name] = text;
    }
  }
  return values;
}

export function createPersonalFreeHandler(
  routes: readonly PersonalFreeRoute[],
  runtime: PersonalFreeRuntime,
  reportError: (error: unknown) => void = error => console.error('Personal-free procedure failed', error),
) {
  const routeMap = new Map(routes.map(route => [`${route.method} ${route.path}`, route]));
  if (routeMap.size !== routes.length) throw new Error('Personal-free routes must be unique');
  return async (request: PersonalFreeRequest): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === '/api/health/ready' && request.method === 'GET') {
      try {
        await runtime.ready();
        return Response.json({ status: 'ready' });
      } catch (error) {
        reportError(error);
        return Response.json({ status: 'not-ready' }, { status: 503 });
      }
    }
    let principal;
    try {
      principal = parseAppPrincipal(request.headers.get('x-ms-client-principal'));
    } catch (error) {
      const forbidden = error instanceof Error && /app role/i.test(error.message);
      return Response.json({ error: forbidden ? 'Owner or member role required' : 'Authentication required' },
        { status: forbidden ? 403 : 401 });
    }
    const route = routeMap.get(`${request.method} ${url.pathname}`);
    if (!route) return Response.json({ error: 'Route not found' }, { status: 404 });
    if (!(route.roles ?? ['owner']).includes(principal.role)) {
      return Response.json({ error: 'Your role cannot perform this operation' }, { status: 403 });
    }
    const candidate = request.method === 'GET'
      ? queryParameters(url.searchParams, route.procedure.parameters)
      : request.body ?? {};
    const parsed = z.record(z.string(), scalar).safeParse(candidate);
    const expected = Object.keys(route.procedure.parameters).sort();
    if (!parsed.success || JSON.stringify(Object.keys(parsed.data).sort()) !== JSON.stringify(expected) ||
        Object.entries(route.procedure.parameters).some(([name, type]) =>
          !(name in parsed.data) || !validParameter(type, parsed.data[name]!))) {
      return Response.json({ error: 'Invalid procedure parameters' }, { status: 400 });
    }
    try {
      const rows = await runtime.execute(principal.ownerId, principal.role, route.procedure.name, parsed.data);
      return Response.json({ value: rows });
    } catch (error) {
      reportError(error);
      return Response.json({ error: 'Service operation failed' }, { status: 500 });
    }
  };
}
