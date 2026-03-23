netlify/functions/plaid-exchange-token.js
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
    const { public_token } = JSON.parse(event.body || '{}');
    if (!public_token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing public_token' }) };
    }

    const response = await plaidClient.itemPublicTokenExchange({ public_token });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        access_token: response.data.access_token,
        item_id: response.data.item_id,
      }),
    };
  } catch (err) {
    console.error('Plaid exchange error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.response?.data?.error_message || err.message }),
    };
  }
};
