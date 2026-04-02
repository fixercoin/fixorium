// src/explorer-worker.ts

export interface Env {
  FIXORIUM_RPC_URL: string;
}

interface Block {
  number: string;
  hash: string;
  timestamp: string;
  transactions: any[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API endpoints
    if (path === '/api/block/latest') {
      const response = await fetch(env.FIXORIUM_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', true],
          id: 1,
        }),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data.result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/block' && url.searchParams.has('hash')) {
      const hash = url.searchParams.get('hash');
      const response = await fetch(env.FIXORIUM_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByHash',
          params: [hash, true],
          id: 1,
        }),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data.result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/tx' && url.searchParams.has('hash')) {
      const hash = url.searchParams.get('hash');
      const response = await fetch(env.FIXORIUM_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [hash],
          id: 1,
        }),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data.result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve static HTML for the explorer UI
    if (path === '/' || path === '/index.html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Fixorium Block Explorer</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .header h1 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            color: rgba(255,255,255,0.8);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
        }
        .stat-card h3 {
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            margin-bottom: 10px;
        }
        .stat-card .value {
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        .search-box {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            background: rgba(255,255,255,0.9);
        }
        .search-input:focus {
            outline: none;
            background: white;
        }
        .recent-blocks {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
        }
        .recent-blocks h2 {
            color: white;
            font-size: 20px;
            margin-bottom: 20px;
        }
        .block-list {
            list-style: none;
        }
        .block-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            color: white;
        }
        .block-item:last-child {
            border-bottom: none;
        }
        .block-number {
            font-weight: bold;
            color: #ffd700;
        }
        .block-hash {
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .loading {
            text-align: center;
            color: white;
            padding: 40px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔷 Fixorium Block Explorer</h1>
            <p>Chain ID: 1122 | Native Token: FXM | Gas Fee: 100 FXM</p>
        </div>

        <div class="stats" id="stats">
            <div class="stat-card">
                <h3>Latest Block</h3>
                <div class="value" id="latestBlock">---</div>
            </div>
            <div class="stat-card">
                <h3>Gas Price</h3>
                <div class="value" id="gasPrice">---</div>
            </div>
            <div class="stat-card">
                <h3>Chain ID</h3>
                <div class="value">1122</div>
            </div>
        </div>

        <div class="search-box">
            <input type="text" class="search-input" placeholder="Search by transaction hash or block number..." id="searchInput">
        </div>

        <div class="recent-blocks">
            <h2>📦 Recent Blocks</h2>
            <div id="blocksList" class="loading">
                <div class="spinner"></div>
                Loading blocks...
            </div>
        </div>
    </div>

    <script>
        const RPC_URL = '/api';

        async function fetchRPC(method, params) {
            const response = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: Date.now()
                })
            });
            const data = await response.json();
            return data.result;
        }

        async function loadStats() {
            try {
                const blockNumber = await fetchRPC('eth_blockNumber', []);
                const latestBlock = parseInt(blockNumber, 16);
                document.getElementById('latestBlock').textContent = latestBlock.toLocaleString();

                const gasPrice = await fetchRPC('eth_gasPrice', []);
                const gasPriceWei = parseInt(gasPrice, 16);
                const gasPriceFXM = gasPriceWei / 1e6; // With 6 decimals
                document.getElementById('gasPrice').textContent = gasPriceFXM.toFixed(6) + ' FXM';
            } catch (err) {
                console.error('Failed to load stats:', err);
            }
        }

        async function loadRecentBlocks() {
            const blocksList = document.getElementById('blocksList');
            blocksList.innerHTML = '<div class="loading"><div class="spinner"></div>Loading blocks...</div>';

            try {
                const blockNumberHex = await fetchRPC('eth_blockNumber', []);
                const latestBlock = parseInt(blockNumberHex, 16);
                const blocks = [];

                for (let i = 0; i < 10 && latestBlock - i >= 0; i++) {
                    const block = await fetchRPC('eth_getBlockByNumber', [
                        '0x' + (latestBlock - i).toString(16),
                        false
                    ]);
                    if (block) {
                        blocks.push({
                            number: parseInt(block.number, 16),
                            hash: block.hash,
                            txCount: block.transactions ? block.transactions.length : 0,
                            timestamp: block.timestamp ? new Date(parseInt(block.timestamp, 16) * 1000).toLocaleString() : 'Pending'
                        });
                    }
                }

                blocksList.innerHTML = \`
                    <ul class="block-list">
                        \${blocks.map(block => \`
                            <li class="block-item">
                                <div>
                                    <span class="block-number">#\${block.number.toLocaleString()}</span>
                                    <div class="block-hash">\${block.hash.substring(0, 20)}...</div>
                                </div>
                                <div style="text-align: right;">
                                    <div>\${block.txCount} txns</div>
                                    <div style="font-size: 11px; opacity: 0.7;">\${block.timestamp}</div>
                                </div>
                            </li>
                        \`).join('')}
                    </ul>
                \`;
            } catch (err) {
                blocksList.innerHTML = '<div class="loading">Failed to load blocks: ' + err.message + '</div>';
            }
        }

        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (!query) return;

                    if (query.startsWith('0x') && query.length === 66) {
                        // Transaction hash
                        window.location.href = '/tx/' + query;
                    } else if (/^\\d+$/.test(query)) {
                        // Block number
                        window.location.href = '/block/' + query;
                    } else {
                        alert('Invalid search query. Enter a transaction hash (0x...) or block number.');
                    }
                }
            });
        }

        loadStats();
        loadRecentBlocks();
        setupSearch();

        // Refresh every 10 seconds
        setInterval(() => {
            loadStats();
            loadRecentBlocks();
        }, 10000);
    </script>
</body>
</html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
