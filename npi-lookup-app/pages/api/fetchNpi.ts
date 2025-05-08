// pages/api/fetchNpi.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Types for API responses
interface NpiApiResponse {
  result_count: number;
  results: NpiResultRaw[];
}

interface NpiResultRaw {
  enumeration_type: string;
  basic: {
    name_prefix?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    organization_name?: string;
    sex?: string;
    last_updated?: string;
  };
  taxonomies: Array<{
    desc?: string;
    primary?: boolean;
    license?: string;
    state?: string;
  }>;
  addresses: Array<{
    address_purpose: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    telephone_number?: string;
    fax_number?: string;
  }>;
}

interface NpiResultProcessed {
  npi: string;
  name: string;
  entityType: string;
  sex: string;
  specialty: string;
  license: string;
  licenseState: string;
  phone: string;
  fax: string;
  address: string;
  lastUpdated: string;
  error?: string;
}

interface ApiResponse {
  results?: NpiResultProcessed[];
  error?: string;
}

// Constants
const MAX_NPIS = 10;
const API_TIMEOUT = 5000; // 5 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // Add CORS headers for API access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const npiParam = req.query.npi;

  if (!npiParam || typeof npiParam !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid NPI parameter' });
  }

  // Process and validate NPI numbers
  const npiList = npiParam
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length === 10 && /^\d+$/.test(n))
    .slice(0, MAX_NPIS);

  if (npiList.length === 0) {
    return res.status(400).json({ error: 'No valid NPI numbers provided' });
  }

  try {
    const results = await Promise.all(npiList.map(fetchNpiData));
    res.status(200).json({ results });
  } catch (err) {
    console.error('General error in NPI handler:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Fetches data for a single NPI number
 */
async function fetchNpiData(npi: string): Promise<NpiResultProcessed> {
  try {
    // Use AbortController to add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const url = `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json() as NpiApiResponse;
    const result = data.results?.[0];

    if (!result) {
      return { npi, error: 'Not found' } as NpiResultProcessed;
    }

    return processNpiResult(npi, result);
  } catch (err) {
    console.error(`Error processing NPI ${npi}:`, err);
    return { 
      npi, 
      error: err instanceof Error && err.name === 'AbortError' 
        ? 'Request timed out' 
        : 'Failed to retrieve provider data'
    } as NpiResultProcessed;
  }
}

/**
 * Processes a raw NPI result into a standardized format
 */
function processNpiResult(npi: string, result: NpiResultRaw): NpiResultProcessed {
  const isIndividual = result.enumeration_type === 'NPI-1';
  const basic = result.basic || {};
  
  // Get provider name
  let name = 'N/A';
  if (isIndividual) {
    // Process individual provider
    name = basic.name_prefix || basic.first_name || basic.last_name 
      ? `${basic.name_prefix || ''} ${basic.first_name || ''} ${basic.middle_name ? basic.middle_name + ' ' : ''}${basic.last_name || ''}`.trim()
      : 'N/A';
  } else {
    // Process organization
    name = basic.organization_name || 'N/A';
  }
  
  // Get sex value for individuals, N/A for organizations
  let sexValue = 'N/A';
  if (isIndividual && basic.sex) {
    sexValue = basic.sex === 'F' ? 'Female' : basic.sex === 'M' ? 'Male' : basic.sex;
  }

  // Extract taxonomy and address information
  const taxonomies = result.taxonomies || [];
  const taxonomy = taxonomies.find((t) => t.primary === true) || taxonomies[0] || {};
  
  const addresses = result.addresses || [];
  const primaryAddress = addresses.find((a) => a.address_purpose === 'LOCATION') || 
                         addresses.find((a) => a.address_purpose === 'MAILING') || 
                         addresses[0] || {};
  
  // Format the last updated date
  let lastUpdated = 'N/A';
  try {
    lastUpdated = basic.last_updated 
      ? new Date(basic.last_updated).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';
  } catch (dateError) {
    console.error(`Error formatting date for NPI ${npi}:`, dateError);
    lastUpdated = basic.last_updated || 'N/A';
  }

  // Build address with proper formatting - simpler approach to avoid type issues
  let formattedAddress = 'N/A';
  
  if (primaryAddress.address_1) {
    const parts = [];
    
    if (primaryAddress.address_1) parts.push(primaryAddress.address_1);
    if (primaryAddress.address_2) parts.push(primaryAddress.address_2);
    if (primaryAddress.city) parts.push(primaryAddress.city);
    
    // Add state and postal code together if both exist
    if (primaryAddress.state && primaryAddress.postal_code) {
      parts.push(`${primaryAddress.state} ${primaryAddress.postal_code}`);
    } else {
      if (primaryAddress.state) parts.push(primaryAddress.state);
      if (primaryAddress.postal_code) parts.push(primaryAddress.postal_code);
    }
    
    if (parts.length > 0) {
      formattedAddress = parts.join(', ');
    }
  }

  return {
    npi,
    name,
    entityType: isIndividual ? 'Individual' : 'Organization',
    sex: sexValue,
    specialty: taxonomy.desc || 'N/A',
    license: taxonomy.license || 'N/A',
    licenseState: taxonomy.state || 'N/A',
    phone: primaryAddress.telephone_number || 'N/A',
    fax: primaryAddress.fax_number || 'N/A',
    address: formattedAddress,
    lastUpdated
  };
}
