netlify/functions/plaid-create-link-token.js
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');

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
    const body    = JSON.parse(event.body || '{}');
    const userId  = body.user_id || 'clearpath_user';

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'ClearPath Finance',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ link_token: response.data.link_token }),
    };
  } catch (err) {
    console.error('Plaid link token error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.response?.data?.error_message || err.message }),
    };
  }
};
