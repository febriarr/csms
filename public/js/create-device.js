document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-create-device');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const data = {};

    // Loop data form & konversi otomatis jika input berjenis number
    formData.forEach((value, key) => {
      const inputElement = form.querySelector(`[name="${key}"]`);

      // Jika input tipe number dan nilainya tidak kosong, ubah ke Float/Int
      if (inputElement && inputElement.type === 'number' && value !== '') {
        data[key] = Number(value);
      } else {
        data[key] = value;
      }
    });

    console.log('--- Data Form Device (Payload Siap Kirim API) ---');
    console.log(data);

    /* 
      
      fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(res => res.json())
      .then(result => console.log('Response API:', result))
      .catch(err => console.error('Error:', err));
    */
  });
});
