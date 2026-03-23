netlify/functions/plaid-get-transactions.js
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const plaidClient = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { access_token, start_date, end_date } = JSON.parse(event.body || '{}');
    if (!access_token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing access_token' }) };
    }

    const sDate = start_date || new Date(Date.now() - 90*24*3600*1000).toISOString().slice(0,10);
    const eDate = end_date   || new Date().toISOString().slice(0,10);

    // Paginate through all transactions
    let allTransactions = [];
    let offset = 0;
    let totalCount = 1;

    while (offset < totalCount) {
      const response = await plaidClient.transactionsGet({
        access_token,
        start_date: sDate,
        end_date: eDate,
        options: { count: 500, offset },
      });

      allTransactions = allTransactions.concat(response.data.transactions);
      totalCount = response.data.total_transactions;
      offset += response.data.transactions.length;

      // Safety break
      if (offset >= 2000) break;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        transactions: allTransactions,
        total: allTransactions.length,
      }),
    };
  } catch (err) {
    console.error('Plaid transactions error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.response?.data?.error_message || err.message }),
    };
  }
};
