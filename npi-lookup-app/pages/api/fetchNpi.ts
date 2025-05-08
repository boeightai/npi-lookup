// pages/api/fetchNpi.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const npiParam = req.query.npi;

  if (!npiParam || typeof npiParam !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid NPI parameter' });
  }

  const npiList = npiParam.split(',').map(n => n.trim());

  try {
    const results = await Promise.all(
      npiList.map(async (npi) => {
        const url = `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`;
        const response = await fetch(url);
        const data = await response.json();
        const result = data.results?.[0];

        if (!result) {
          return { npi, error: 'Not found' };
        }

        const basic = result.basic;
        const taxonomy = result.taxonomies.find((t: any) => t.primary) || {};
        const primaryAddress = result.addresses.find((a: any) => a.address_purpose === 'LOCATION');

        return {
          npi,
          name: `${basic.name_prefix || ''} ${basic.first_name} ${basic.middle_name || ''} ${basic.last_name}`.trim(),
          specialty: taxonomy.desc || 'N/A',
          license: taxonomy.license || 'N/A',
          phone: primaryAddress?.telephone_number || 'N/A',
          fax: primaryAddress?.fax_number || 'N/A',
          address: `${primaryAddress?.address_1 || ''}, ${primaryAddress?.city || ''}, ${primaryAddress?.state || ''} ${primaryAddress?.postal_code || ''}`.trim(),
        };
      })
    );

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
