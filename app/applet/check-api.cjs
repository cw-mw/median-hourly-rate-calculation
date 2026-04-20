fetch('http://localhost:3000/api/parse-pdf', { method: 'POST' })
  .then(res => res.text().then(text => console.log('Status:', res.status, 'Body:', text.substring(0, 100))))
  .catch(err => console.error(err));
