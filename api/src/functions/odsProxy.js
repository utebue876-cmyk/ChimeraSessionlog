const { app } = require('@azure/functions');

const ODS_API_BASE = 'https://www.odsdatasearchandexport.nhs.uk/api';

app.http('odsProxy', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'ods-proxy/{*restOfPath}',
  handler: async (request, context) => {
    const restOfPath = request.params.restOfPath ?? '';
    const url = new URL(request.url);
    const targetUrl = `${ODS_API_BASE}/${restOfPath}${url.search}`;

    context.log(`ODS proxy: ${request.method} ${targetUrl}`);

    const fetchOptions = {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(targetUrl, fetchOptions);
    const body = await response.text();

    return {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  },
});
