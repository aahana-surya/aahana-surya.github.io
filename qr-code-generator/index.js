const form = document.getElementById('qr-form');
const qrOutput = document.getElementById('qr-output');
const qrContainer = document.getElementById('qrcode');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const url = document.getElementById('url-input').value.trim();

  if (!url) {
    return;
  }

  if (typeof QRCode === 'undefined') {
    alert('Unable to load the QR code library. Please refresh the page and try again.');
    return;
  }

  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: url,
    width: 240,
    height: 240,
    colorDark: '#111827',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });

  qrOutput.hidden = false;
});
  



