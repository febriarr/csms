document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('temperature-report-form');
  const fromInput = document.getElementById('from');
  const toInput = document.getElementById('to');

  if (!form || !fromInput || !toInput) return;

  const today = new Date().toISOString().slice(0, 10);
  toInput.max = today;
  fromInput.max = today;

  function syncMinTo() {
    if (fromInput.value) {
      toInput.min = fromInput.value;
    }
  }

  fromInput.addEventListener('change', syncMinTo);
  syncMinTo();

  form.addEventListener('submit', event => {
    if (fromInput.value && toInput.value && fromInput.value > toInput.value) {
      event.preventDefault();
      alert('Tanggal mulai harus sebelum atau sama dengan tanggal akhir.');
    }
  });
});
