async function getHeaders() {
  try {
    const res = await fetch('https://faxzubfvjsekizeiiocg.supabase.co');
    console.log('Response status:', res.status);
    console.log('Response headers:');
    for (const [key, value] of res.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch (error) {
    console.error('Error fetching headers:', error);
  }
}
getHeaders();
