const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
  try {
    // Generate an empty buffer for testing
    const buffer = Buffer.from('test image content');
    const form = new FormData();
    form.append('avatar', buffer, { filename: 'test.png', contentType: 'image/png' });

    console.log('Sending upload request...');
    const res = await axios.post('http://localhost:5000/api/upload/avatar', form, {
      headers: { ...form.getHeaders() }
    });
    console.log('Upload success:', res.data);
  } catch (err) {
    console.error('Upload Error Details:', err.response?.data || err.message);
  }
}

async function testNotifications() {
  try {
    const res = await axios.get('http://localhost:5000/api/notifications', {
      headers: { 'Authorization': 'Bearer DUMMY_TOKEN' }
    });
    console.log('Notifications success:', res.data);
  } catch (err) {
    console.error('Notifications Error Details:', err.response?.data || err.message);
  }
}

testUpload();
testNotifications();
