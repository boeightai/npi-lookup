console.log("⏳ Fetching data...");

const url = 'https://npiregistry.cms.hhs.gov/api/?number=1467560003&version=2.1';

try {
  const response = await fetch(url);
  const data = await response.json();

  const result = data.results?.[0];
  if (!result) throw new Error("No results found.");

  const basic = result.basic;
  const name = `${basic.name_prefix || ''} ${basic.first_name} ${basic.middle_name || ''} ${basic.last_name}, ${basic.credential || ''}`.replace(/\s+/g, ' ').trim();

  const npi = result.number;
  const lastUpdated = basic.last_updated;

  const taxonomy = result.taxonomies?.find(t => t.primary) || {};
  const specialty = taxonomy.desc || 'N/A';
  const taxonomyCode = taxonomy.code || 'N/A';
  const taxonomyState = taxonomy.state || 'N/A';
  const licenseNumber = taxonomy.license || 'N/A';

  const mailingAddress = result.addresses?.find(a => a.address_purpose === 'MAILING');
  const primaryAddress = result.addresses?.find(a => a.address_purpose === 'LOCATION');

  const identifiers = result.identifiers || [];

  // Output
  console.log(`👨‍⚕️ Name: ${name}`);
  console.log(`🆔 NPI #: ${npi}`);
  console.log(`🕒 Last Updated: ${lastUpdated}`);
  console.log(`📋 Specialty: ${specialty}`);
  console.log(`🔢 Taxonomy Code: ${taxonomyCode}`);
  console.log(`📍 Taxonomy State: ${taxonomyState}`);
  console.log(`🧾 License Number: ${licenseNumber}`);

  if (mailingAddress) {
    console.log(`📬 Mailing Address: ${mailingAddress.address_1}, ${mailingAddress.city}, ${mailingAddress.state} ${mailingAddress.postal_code}`);
  }

  if (primaryAddress) {
    console.log(`🏥 Primary Practice Address: ${primaryAddress.address_1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`);
    console.log(`📞 Phone: ${primaryAddress.telephone_number}`);
    console.log(`📠 Fax: ${primaryAddress.fax_number}`);
  }

  if (identifiers.length) {
    console.log(`🆔 Other Identifiers:`);
    identifiers.forEach(id => {
      console.log(`   - ${id.desc || 'N/A'} | ${id.issuer || 'No Issuer'} | ${id.state || 'No State'} | ID: ${id.identifier}`);
    });
  }

} catch (error) {
  console.error('❌ Error fetching or parsing data:', error);
}
