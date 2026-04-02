// src/rpc-worker.ts

export interface Env {
  // Your Fixorium node URLs
  FIXORIUM_RPC_URLS: string;
  FAILURE_ERROR_CODE_LIST: string;
  KV_RPC_HEALTH: KVNamespace;
}

// List of error codes that trigger node failover
const DEFAULT_FAILURE_CODES = "429,400,403,500,502,503,504";

// Health check interval (milliseconds)
const HEALTH_CHECK_INTERVAL = 30000;

// Mark node as unhealthy after consecutive failures
const MAX_CONSECUTIVE_FAILURES = 3;

// Keep unhealthy nodes out of rotation for this long (milliseconds)
const UNHEALTHY_TIMEOUT = 60000;

// RPC methods that are read-only (cacheable)
const CACHEABLE_METHODS = new Set([
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getTransactionByHash',
  'eth_getLogs',
  'eth_getBalance',
  'eth_getCode',
  'eth_call',
  'net_version',
  'web3_clientVersion',
  'eth_chainId',
  'eth_gasPrice',
  'eth_blockNumber',
]);

// RPC methods that are write operations (skip cache, use all nodes)
const WRITE_METHODS = new Set([
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
]);

/**
 * Health check for a single RPC node
 */
async function checkNodeHealth(url: string, env: Env): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: Date.now()
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    return !data.error;
  } catch {
    return false;
  }
}

/**
 * Get healthy RPC nodes
 */
async function getHealthyNodes(env: Env): Promise<string[]> {
  const allUrls = env.FIXORIUM_RPC_URLS.split(',');
  const healthy: string[] = [];

  for (const url of allUrls) {
    const healthKey = `health:${Buffer.from(url).toString('base64')}`;
    const healthData = await env.KV_RPC_HEALTH.get(healthKey, 'json');

    if (!healthData) {
      // No health data, assume healthy
      healthy.push(url);
      continue;
    }

    const { failures, lastFailure } = healthData as { failures: number; lastFailure: number };
    const now = Date.now();

    // If node has been unhealthy for longer than timeout, try again
    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      if (now - lastFailure > UNHEALTHY_TIMEOUT) {
        // Recheck the node
        const isHealthy = await checkNodeHealth(url, env);
        if (isHealthy) {
          // Reset failures
          await env.KV_RPC_HEALTH.delete(healthKey);
          healthy.push(url);
        }
      }
      // Skip unhealthy node
      continue;
    }

    healthy.push(url);
  }

  return healthy;
}

/**
 * Mark a node as unhealthy
 */
async function markNodeUnhealthy(url: string, env: Env): Promise<void> {
  const healthKey = `health:${Buffer.from(url).toString('base64')}`;
  const existing = await env.KV_RPC_HEALTH.get(healthKey, 'json');

  let failures = 1;
  if (existing) {
    failures = (existing as { failures: number }).failures + 1;
  }

  await env.KV_RPC_HEALTH.put(healthKey, JSON.stringify({
    failures,
    lastFailure: Date.now(),
    url,
  }), { expirationTtl: 3600 });
}

/**
 * Mark a node as healthy (reset failures)
 */
async function markNodeHealthy(url: string, env: Env): Promise<void> {
  const healthKey = `health:${Buffer.from(url).toString('base64')}`;
  await env.KV_RPC_HEALTH.delete(healthKey);
}

/**
 * Check if request should be cached
 */
function shouldCache(method: string): boolean {
  return CACHEABLE_METHODS.has(method);
}

/**
 * Generate cache key from request
 */
function getCacheKey(request: Request): string {
  const url = new URL(request.url);
  return `rpc:${url.pathname}:${request.body ? request.body.toString() : ''}`;
}

/**
 * Main fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only accept POST requests for RPC
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Parse request body to get method
      const bodyText = await request.text();
      let rpcMethod = '';
      try {
        const parsed = JSON.parse(bodyText);
        rpcMethod = parsed.method || '';
      } catch {
        // Invalid JSON, continue
      }

      // Check cache for read-only methods
      if (shouldCache(rpcMethod)) {
        const cacheKey = getCacheKey(request);
        const cachedResponse = await caches.default.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      // Get healthy nodes
      let healthyNodes = await getHealthyNodes(env);

      if (healthyNodes.length === 0) {
        // Fallback to all nodes
        healthyNodes = env.FIXORIUM_RPC_URLS.split(',');
      }

      // Shuffle nodes for load balancing
      const shuffled = [...healthyNodes];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Try each node until one succeeds
      let lastError: Error | null = null;
      let responseData: any = null;
      let successUrl = '';

      for (const nodeUrl of shuffled) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const nodeResponse = await fetch(nodeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: bodyText,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const nodeData = await nodeResponse.json();

          // Check for RPC errors
          if (nodeData.error) {
            const errorCode = nodeData.error.code;
            const failureCodes = env.FAILURE_ERROR_CODE_LIST?.split(',') || DEFAULT_FAILURE_CODES.split(',');

            if (failureCodes.includes(String(errorCode))) {
              // Mark node as unhealthy for this error
              await markNodeUnhealthy(nodeUrl, env);
              throw new Error(`RPC error: ${nodeData.error.message}`);
            }
          }

          // Success!
          responseData = nodeData;
          successUrl = nodeUrl;
          await markNodeHealthy(nodeUrl, env);
          break;

        } catch (err: any) {
          lastError = err;
          await markNodeUnhealthy(nodeUrl, env);
          continue;
        }
      }

      if (!responseData) {
        throw lastError || new Error('All RPC nodes failed');
      }

      // Prepare response
      const response = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-RPC-Node': successUrl,
          'Cache-Control': shouldCache(rpcMethod) ? 'public, max-age=30' : 'no-store',
        },
      });

      // Cache read-only responses
      if (shouldCache(rpcMethod)) {
        ctx.waitUntil(caches.default.put(request, response.clone()));
      }

      return response;

    } catch (err: any) {
      console.error('RPC Worker error:', err);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: err.message || 'Internal server error',
        },
        id: null,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },

  /**
   * Scheduled health check for all nodes
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const allUrls = env.FIXORIUM_RPC_URLS.split(',');

    await Promise.all(allUrls.map(async (url) => {
      const isHealthy = await checkNodeHealth(url, env);
      if (isHealthy) {
        await markNodeHealthy(url, env);
      } else {
        await markNodeUnhealthy(url, env);
      }
    }));

    console.log(`Health check completed. Checked ${allUrls.length} nodes.`);
  },
};
