const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function runTests() {
  const token = fs.readFileSync('token.txt', 'utf8').trim();
  
  try {
    const buffer = Buffer.from('test image content, not real picture, but lets see if multer parses');
    const form = new FormData();
    form.append('avatar', buffer, { filename: 'test.png', contentType: 'image/png' });

    console.log('Sending upload request...');
    const res = await axios.post('http://localhost:5000/api/upload/avatar', form, {
      headers: { 
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}` 
      }
    });
    console.log('Upload success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Upload Failed with status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Upload Error:', err.message);
    }
  }
}

runTests();
